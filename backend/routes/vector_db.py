from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
import os
import shutil
import tempfile
from services.vector_service import (
    list_pinecone_indexes, 
    create_pinecone_index, 
    delete_pinecone_index,
    list_qdrant_collections,
    create_qdrant_collection,
    delete_qdrant_collection,
    list_weaviate_classes,
    create_weaviate_class,
    delete_weaviate_class,
    upload_file_to_vector_db
)

router = APIRouter(prefix="/vector-db", tags=["Vector Database"])

@router.get("/indexes")
def get_indexes(
    vector_db: str = "Pinecone",
    api_key: Optional[str] = None,
    url: Optional[str] = None
):
    try:
        if vector_db.lower() == "pinecone":
            indexes = list_pinecone_indexes(api_key)
        elif vector_db.lower() == "qdrant":
            indexes = list_qdrant_collections(url, api_key)
        elif vector_db.lower() == "weaviate":
            indexes = list_weaviate_classes(url, api_key)
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
    try:
        if vector_db.lower() == "pinecone":
            create_pinecone_index(name, dimension, api_key, metric)
        elif vector_db.lower() == "qdrant":
            create_qdrant_collection(
                name, dimension, url, api_key, metric, 
                search_type, dense_vector_name, sparse_vector_name
            )
        elif vector_db.lower() == "weaviate":
            create_weaviate_class(name, url, api_key)
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
    try:
        if vector_db.lower() == "pinecone":
            delete_pinecone_index(name, api_key)
        elif vector_db.lower() == "qdrant":
            delete_qdrant_collection(name, url, api_key)
        elif vector_db.lower() == "weaviate":
            delete_weaviate_class(name, url, api_key)
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
    sparse_vector_name: str = Form("text-sparse")
):
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        num_splits = await upload_file_to_vector_db(
            tmp_path, 
            index_name, 
            embedding_model, 
            vector_db,
            url,
            chunk_size, 
            chunk_overlap, 
            api_key,
            openai_key,
            google_key,
            search_type,
            dense_vector_name,
            sparse_vector_name
        )
        return {"message": "File uploaded and indexed successfully", "chunks": num_splits}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
