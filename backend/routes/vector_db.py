from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import os
import shutil
import tempfile
from services.vector_service import (
    list_pinecone_indexes, 
    create_pinecone_index, 
    delete_pinecone_index,
    upload_file_to_vector_db
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vector-db", tags=["Vector Database"])

@router.get("/indexes")
def get_indexes(
    vector_db: str = "Pinecone",
    api_key: Optional[str] = None,
    url: Optional[str] = None
):
    """Lists available indexes or collections for a given vector database provider."""
    try:
        if vector_db.lower() == "pinecone":
            indexes = list_pinecone_indexes(api_key)
        elif vector_db.lower() in ["qdrant", "weaviate", "aws", "azure", "vertex"]:
            # These providers use manual input in the UI, so we don't need to list them
            indexes = []
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported vector database: {vector_db}")
        return {"indexes": indexes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/indexes")
def create_index(
    name: str = Form(...), 
    dimension: int = Form(...), 
    vector_db: str = Form("Pinecone"),
    api_key: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    metric: str = Form("cosine"),
    search_type: str = Form("dense"),
    dense_vector_name: str = Form("text-dense"),
    sparse_vector_name: str = Form("text-sparse")
):
    """Creates a new index or collection in the specified vector database."""
    try:
        if vector_db.lower() == "pinecone":
            create_pinecone_index(name, dimension, api_key, metric)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported vector database: {vector_db}")
        return {"message": f"Index/Collection {name} created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/indexes/{name}")
def delete_index(
    name: str, 
    vector_db: str = "Pinecone",
    api_key: Optional[str] = None,
    url: Optional[str] = None
):
    """Deletes an index or collection from the specified vector database."""
    try:
        if vector_db.lower() == "pinecone":
            delete_pinecone_index(name, api_key)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported vector database: {vector_db}")
        return {"message": f"Index/Collection {name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    index_name: str = Form(...),
    embedding_model: str = Form(...),
    vector_db: str = Form("Pinecone"),
    url: Optional[str] = Form(None),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200),
    api_key: Optional[str] = Form(None),
    openai_key: Optional[str] = Form(None),
    google_key: Optional[str] = Form(None),
    search_type: str = Form("dense"),
    dense_vector_name: str = Form("text-dense"),
    sparse_vector_name: str = Form("text-sparse"),
    gcp_service_account_json: Optional[str] = Form(None),
    gcp_project_id: Optional[str] = Form(None),
    gcp_location: Optional[str] = Form(None),
    gcp_gcs_path: Optional[str] = Form(None),
    aws_access_key: Optional[str] = Form(None),
    aws_secret_key: Optional[str] = Form(None),
    aws_region: Optional[str] = Form(None),
    agent_id: Optional[str] = Form(None)
):
    """Uploads a PDF file, splits it into chunks, and indexes it into the chosen vector database."""
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        num_splits = await upload_file_to_vector_db(
            tmp_path, 
            index_name, 
            embedding_model, 
            agent_id,
            vector_db,
            url,
            chunk_size, 
            chunk_overlap, 
            api_key,
            openai_key,
            google_key,
            search_type,
            dense_vector_name,
            sparse_vector_name,
            gcp_service_account_json,
            gcp_project_id,
            gcp_location,
            gcp_gcs_path,
            aws_access_key,
            aws_secret_key,
            aws_region
        )
        return {"message": "File uploaded and indexed successfully", "chunks": num_splits}
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
