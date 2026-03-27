from fastapi import APIRouter, HTTPException
from typing import List, Optional
from models.agent import AgentConfig
from utils.file_store import save_agent, get_agent, list_agents, delete_agent, get_agent_by_slug
from services.agent_cache import agent_cache
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("/validate-slug/{slug}")
def validate_slug(slug: str, exclude_id: Optional[str] = None):
    """Checks if a slug is already in use by another agent."""
    agent = get_agent_by_slug(slug)
    if agent and (exclude_id is None or agent.id != exclude_id):
        return {"available": False}
    return {"available": True}

@router.post("/validate")
async def validate_config(agent: AgentConfig):
    """Validates the entire agent configuration, including checking LLM and VectorDB connectivity."""
    errors = {}
    
    # 1. LLM Validation
    provider = agent.llm.provider.lower()
    api_key = agent.llm.api_key
    
    # Fallback to env if empty
    if not api_key:
        env_map = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "gemini": "GOOGLE_API_KEY",
            "mistral": "MISTRAL_API_KEY"
        }
        api_key = os.getenv(env_map.get(provider, ""))

    if api_key:
        try:
            # Try a very basic call to verify key
            if provider == "openai":
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                client.models.list()
            elif provider == "anthropic":
                from anthropic import Anthropic
                client = Anthropic(api_key=api_key)
                client.models.list()
            elif provider == "gemini":
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                genai.list_models()
        except Exception as e:
            logger.error(f"LLM Validation Error for provider {provider}: {str(e)}")
            errors["llm.api_key"] = f"Invalid Key: {str(e)}"
    else:
        errors["llm.api_key"] = f"Missing API Key for {agent.llm.provider}"

    # 2. RAG Validation
    if agent.rag.enabled:
        from services.vector_service import (
            list_pinecone_indexes,
            list_qdrant_collections,
            list_weaviate_classes
        )
        
        db = agent.rag.vector_db.lower()
        rag_api_key = agent.rag.api_key or os.getenv(f"{db.upper()}_API_KEY")
        rag_url = agent.rag.url
        
        if db == "qdrant" and not rag_url:
            rag_url = os.getenv("QDRANT_URL")
        elif db == "weaviate" and not rag_url:
            rag_url = os.getenv("WEAVIATE_URL")

        try:
            if db == "pinecone":
                if not rag_api_key:
                    errors["rag.api_key"] = "Pinecone API Key not found"
                else:
                    indexes = list_pinecone_indexes(rag_api_key)
                    if agent.rag.index_name and agent.rag.index_name not in indexes:
                        errors["rag.index_name"] = f"Index '{agent.rag.index_name}' not found"
            
            elif db == "qdrant":
                if not rag_url:
                    errors["rag.url"] = "Qdrant URL not found"
                if not rag_api_key:
                    errors["rag.api_key"] = "Qdrant API Key not found"
                if rag_url and rag_api_key:
                    collections = list_qdrant_collections(rag_url, rag_api_key)
                    if agent.rag.index_name and agent.rag.index_name not in collections:
                        errors["rag.index_name"] = f"Collection '{agent.rag.index_name}' not found"
            
            elif db == "weaviate":
                if not rag_url:
                    errors["rag.url"] = "Weaviate URL not found"
                if not rag_api_key:
                    errors["rag.api_key"] = "Weaviate API Key not found"
                if rag_url and rag_api_key:
                    classes = list_weaviate_classes(rag_url, rag_api_key)
                    if agent.rag.index_name and agent.rag.index_name not in classes:
                        errors["rag.index_name"] = f"Class '{agent.rag.index_name}' not found"
        except Exception as e:
            err_msg = str(e).lower()
            if "api" in err_msg or "unauthorized" in err_msg or "401" in err_msg:
                errors["rag.api_key"] = f"Auth Failed: {str(e)}"
            elif "url" in err_msg or "connection" in err_msg or "reach" in err_msg:
                errors["rag.url"] = f"Connection Failed: {str(e)}"
            else:
                errors["rag.index_name"] = f"RAG Error: {str(e)}"

    return {"valid": len(errors) == 0, "errors": errors}

@router.post("/", response_model=AgentConfig)
def create_agent(agent: AgentConfig):
    """Creates a new agent configuration."""
    return save_agent(agent)

@router.get("/", response_model=List[AgentConfig])
def get_all_agents():
    """Returns a list of all saved agents."""
    return list_agents()

@router.get("/{id}", response_model=AgentConfig)
def get_agent_by_id(id: str):
    """Retrieves an agent by its ID or slug."""
    agent = get_agent(id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{id}", response_model=AgentConfig)
def update_agent(id: str, agent: AgentConfig):
    """Updates an existing agent configuration."""
    if agent.id != id:
        raise HTTPException(status_code=400, detail="ID mismatch")
    return save_agent(agent)

@router.post("/{id}/deploy", response_model=AgentConfig)
def deploy_agent(id: str):
    """Deploys an agent, making it visible to public requests."""
    agent = get_agent(id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_deployed = True
    return save_agent(agent)

@router.post("/{id}/deactivate", response_model=AgentConfig)
def deactivate_agent(id: str):
    """Deactivates an agent configuration."""
    agent = get_agent(id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_deployed = False
    return save_agent(agent)

@router.delete("/{id}")
def delete_agent_by_id(id: str):
    """Deletes an agent and invalidates its cache."""
    agent_cache.invalidate(id)
    success = delete_agent(id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted successfully"}
