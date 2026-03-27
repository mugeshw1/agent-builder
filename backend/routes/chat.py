from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import time

from utils.file_store import get_agent
from services.agent_builder import build_agent
from services.agent_cache import agent_cache
from services.session_manager import session_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    response: str
    latency_ms: float
    retrieved_chunks: list = []

@router.post("/{id}/chat", response_model=ChatResponse)
async def chat_with_agent(id: str, request: ChatRequest):
    """Sends a message to a specific agent and returns the AI response, including RAG context if enabled."""
    agent_config = get_agent(id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    start_time = time.time()
    
    try:
        # 1. Try to get from Cache First
        agent_bundle = agent_cache.get(id, agent_config.model_dump())
        
        # 2. If not in cache, Build and Store
        if not agent_bundle:
            agent_bundle = build_agent(agent_config)
            agent_cache.set(id, agent_config.model_dump(), agent_bundle)

    except Exception as e:
        logger.error(f"Failed to build agent {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to build agent: {str(e)}")
        
    chain = agent_bundle["chain"]
    agent_type = agent_bundle["type"]
    
    retrieved_chunks = []
    response_text = ""
    
    # 3. Get Session History
    history_key = f"{id}_{request.session_id}"
    history = session_manager.get_history(history_key)
    chat_history = history.messages

    try:
        if agent_type == "rag":
            result = chain.invoke({
                "input": request.message,
                "chat_history": chat_history
            })
            response_text = result["answer"]
            
            # Extract retrieved chunks
            if "context" in result:
                for doc in result["context"]:
                    retrieved_chunks.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                    })
        else:
            result = chain.invoke({
                "input": request.message,
                "chat_history": chat_history
            })
            response_text = result.content
            
        # 4. Update History
        history.add_user_message(request.message)
        history.add_ai_message(response_text)

        latency_ms = (time.time() - start_time) * 1000

        return ChatResponse(
            response=response_text,
            latency_ms=latency_ms,
            retrieved_chunks=retrieved_chunks
        )
    except Exception as e:
        logger.error(f"Chat error for agent {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
