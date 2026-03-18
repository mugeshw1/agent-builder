from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

# Embedding models grouped by provider
EMBEDDING_MODELS_BY_PROVIDER = {
    "openai": [
        "text-embedding-3-small",
        "text-embedding-3-large",
        "text-embedding-ada-002",
    ],
    "gemini": [
        "gemini-embedding-001",
    ]
}

class LLMConfig(BaseModel):
    provider: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 1000
    api_key: Optional[str] = None

class FewShotExample(BaseModel):
    user: str
    assistant: str

class PromptConfig(BaseModel):
    system_prompt: str
    few_shot_examples: List[FewShotExample] = []
    input_variables: List[str] = []

class RAGConfig(BaseModel):
    enabled: bool = False
    vector_db: str = "Pinecone"
    api_key: Optional[str] = None
    url: Optional[str] = None
    index_name: Optional[str] = None
    embedding_model: Optional[str] = "text-embedding-3-small"
    top_k: int = 3
    similarity_threshold: float = 0.7
    search_type: str = "dense"
    dense_vector_name: str = "text-dense"
    sparse_vector_name: str = "text-sparse"
    gcp_service_account_json: Optional[str] = None
    gcp_project_id: Optional[str] = None
    gcp_location: Optional[str] = None
    gcp_gcs_path: Optional[str] = None
    aws_access_key: Optional[str] = None
    aws_secret_key: Optional[str] = None
    aws_region: Optional[str] = None

class OutputConfig(BaseModel):
    format: str = "Plain text"
    max_length: int = 2000

class AgentConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    is_deployed: bool = False
    llm: LLMConfig
    prompt: PromptConfig
    rag: RAGConfig
    output: OutputConfig
