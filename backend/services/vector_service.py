import os
import tempfile
from typing import Optional, List
from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore

def get_pinecone_client(api_key: Optional[str] = None):
    return Pinecone(api_key=api_key or os.getenv("PINECONE_API_KEY"))

def list_pinecone_indexes(api_key: Optional[str] = None):
    pc = get_pinecone_client(api_key)
    return [idx.name for idx in pc.list_indexes()]

def create_pinecone_index(name: str, dimension: int, api_key: Optional[str] = None, metric: str = "cosine"):
    pc = get_pinecone_client(api_key)
    pc.create_index(
        name=name,
        dimension=dimension,
        metric=metric,
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
    return True

def delete_pinecone_index(name: str, api_key: Optional[str] = None):
    pc = get_pinecone_client(api_key)
    pc.delete_index(name)
    return True

# --- Qdrant specific logic ---
def get_qdrant_client(url: Optional[str] = None, api_key: Optional[str] = None):
    from qdrant_client import QdrantClient
    return QdrantClient(
        url=url or os.getenv("QDRANT_URL"),
        api_key=api_key or os.getenv("QDRANT_API_KEY")
    )

def list_qdrant_collections(url: Optional[str] = None, api_key: Optional[str] = None):
    client = get_qdrant_client(url, api_key)
    collections = client.get_collections()
    return [c.name for c in collections.collections]

def create_qdrant_collection(
    name: str, 
    dimension: int, 
    url: Optional[str] = None, 
    api_key: Optional[str] = None, 
    metric: str = "Cosine",
    search_type: str = "dense",
    dense_vector_name: str = "text-dense",
    sparse_vector_name: str = "text-sparse"
):
    from qdrant_client.http import models
    client = get_qdrant_client(url, api_key)
    
    qdrant_metric = models.Distance.COSINE
    if metric.lower() == "euclidean":
        qdrant_metric = models.Distance.EUCLID
    elif metric.lower() == "dotproduct":
        qdrant_metric = models.Distance.DOT

    vectors_config = {
        dense_vector_name: models.VectorParams(size=dimension, distance=qdrant_metric)
    }
    
    sparse_vectors_config = None
    if search_type == "hybrid":
        sparse_vectors_config = {
            sparse_vector_name: models.SparseVectorParams()
        }

    client.create_collection(
        collection_name=name,
        vectors_config=vectors_config,
        sparse_vectors_config=sparse_vectors_config
    )
    return True

def delete_qdrant_collection(name: str, url: Optional[str] = None, api_key: Optional[str] = None):
    client = get_qdrant_client(url, api_key)
    client.delete_collection(collection_name=name)
    return True

# --- Weaviate specific logic ---
def get_weaviate_client(url: Optional[str] = None, api_key: Optional[str] = None):
    import weaviate
    from weaviate.classes.init import Auth
    
    # Check if url has protocol, if not add it
    if url and not url.startswith("http"):
        url = f"https://{url}"
        
    headers = {}
    if api_key:
        headers["X-OpenAI-Api-Key"] = os.getenv("OPENAI_API_KEY") # Optional: helps with weaviate vectorizers
        
    return weaviate.connect_to_weaviate_cloud(
        cluster_url=url or os.getenv("WEAVIATE_URL"),
        auth_credentials=Auth.api_key(api_key or os.getenv("WEAVIATE_API_KEY")),
        headers=headers
    )

def list_weaviate_classes(url: Optional[str] = None, api_key: Optional[str] = None):
    client = get_weaviate_client(url, api_key)
    try:
        collections = client.collections.list_all()
        return [name for name in collections]
    finally:
        client.close()

def create_weaviate_class(name: str, url: Optional[str] = None, api_key: Optional[str] = None):
    import weaviate.classes.config as wc
    client = get_weaviate_client(url, api_key)
    try:
        client.collections.create(
            name=name,
            vectorizer_config=wc.Configure.Vectorizer.none(),
        )
        return True
    finally:
        client.close()

def delete_weaviate_class(name: str, url: Optional[str] = None, api_key: Optional[str] = None):
    client = get_weaviate_client(url, api_key)
    try:
        client.collections.delete(name)
        return True
    finally:
        client.close()

async def upload_file_to_vector_db(
    file_path: str, 
    index_name: str, 
    embedding_model: str, 
    vector_db: str = "Pinecone",
    url: str = None,
    chunk_size: int = 1000, 
    chunk_overlap: int = 200, 
    api_key: Optional[str] = None,
    openai_key: Optional[str] = None,
    google_key: Optional[str] = None,
    search_type: str = "dense",
    dense_vector_name: str = "text-dense",
    sparse_vector_name: str = "text-sparse"
):
    # 1. Load Document
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    
    # 2. Split Document
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    splits = text_splitter.split_documents(docs)
    
    # 3. Setup Embeddings
    # 3. Setup Embeddings
    from models.agent import EMBEDDING_MODELS_BY_PROVIDER
    
    provider = "openai"
    for p, models in EMBEDDING_MODELS_BY_PROVIDER.items():
        if embedding_model in models:
            provider = p
            break
            
    if provider == "gemini":
        embeddings = GoogleGenerativeAIEmbeddings(
            model=embedding_model,
            google_api_key=google_key or os.getenv("GOOGLE_API_KEY")
        )
    else:
        # Defaults to OpenAI
        embeddings = OpenAIEmbeddings(
            model=embedding_model,
            api_key=openai_key or os.getenv("OPENAI_API_KEY")
        )
    
    # 4. Upsert to Vector DB
    if vector_db.lower() == "pinecone":
        pc = get_pinecone_client(api_key)
        index = pc.Index(index_name)
        vectorstore = PineconeVectorStore(index=index, embedding=embeddings)
        vectorstore.add_documents(splits)
    elif vector_db.lower() == "qdrant":
        from qdrant_client import QdrantClient
        from langchain_qdrant import QdrantVectorStore, RetrievalMode
        client = QdrantClient(
            url=url or os.getenv("QDRANT_URL"),
            api_key=api_key or os.getenv("QDRANT_API_KEY")
        )
        
        if search_type == "hybrid":
            from langchain_qdrant import FastEmbedSparse
            sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
            vectorstore = QdrantVectorStore(
                client=client,
                collection_name=index_name,
                embedding=embeddings,
                sparse_embedding=sparse_embeddings,
                vector_name=dense_vector_name or "text-dense",
                sparse_vector_name=sparse_vector_name or "text-sparse",
                retrieval_mode=RetrievalMode.HYBRID
            )
        else:
            vectorstore = QdrantVectorStore(
                client=client,
                collection_name=index_name,
                embedding=embeddings,
                vector_name=dense_vector_name or "text-dense"
            )
        vectorstore.add_documents(splits)
    elif vector_db.lower() == "weaviate":
        import weaviate
        from langchain_weaviate import WeaviateVectorStore
        
        # Weaviate usually requires the URL to be formatted correctly
        weaviate_url = url or os.getenv("WEAVIATE_URL")
        if weaviate_url and not weaviate_url.startswith("http"):
            weaviate_url = f"https://{weaviate_url}"
            
        auth_config = None
        if api_key or os.getenv("WEAVIATE_API_KEY"):
            auth_config = weaviate.classes.init.Auth.api_key(api_key or os.getenv("WEAVIATE_API_KEY"))

        client = weaviate.connect_to_weaviate_cloud(
            cluster_url=weaviate_url,
            auth_credentials=auth_config
        )
        
        try:
            vectorstore = WeaviateVectorStore(
                client=client,
                index_name=index_name,
                text_key="text",
                embedding=embeddings
            )
            vectorstore.add_documents(splits)
        finally:
            client.close()
    else:
        raise ValueError(f"Unsupported vector database: {vector_db}")
    
    return len(splits)
