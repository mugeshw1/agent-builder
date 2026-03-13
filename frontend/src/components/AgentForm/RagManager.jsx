import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Upload, ChevronRight, Check, Loader2, AlertCircle, FileText, Trash2 } from "lucide-react";
import axios from "axios";

export default function RagManager({ isOpen, onClose, initialIndex = null, rag }) {
  const embeddingModel = rag?.embedding_model;
  const [step, setStep] = useState(initialIndex ? 2 : 1);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Step 1: Create Index
  const [indexName, setIndexName] = useState(initialIndex || "");
  const [dimension, setDimension] = useState(1536); // Default for OpenAI small

  // Step 2: Upload File
  const [file, setFile] = useState(null);
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(200);

  // Reset state on open or change
  useEffect(() => {
    if (isOpen) {
      setStep(initialIndex ? 2 : 1);
      setIndexName(initialIndex || "");
      setError("");
      setSuccess("");
      setFile(null);
    }
  }, [isOpen, initialIndex]);

  // Sync dimension with embedding model
  useEffect(() => {
    if (embeddingModel === "text-embedding-3-small") setDimension(1536);
    else if (embeddingModel === "text-embedding-3-large") setDimension(3072);
    else if (embeddingModel === "text-embedding-ada-002") setDimension(1536);
    else if (embeddingModel === "gemini-embedding-001") setDimension(768);
    else if (embeddingModel === "models/embedding-001") setDimension(768);
  }, [embeddingModel]);

  const handleCreateIndex = async () => {
    setIsCreating(true);
    setError("");
    const formData = new FormData();
    formData.append("name", indexName);
    formData.append("dimension", dimension);
    formData.append("vector_db", rag.vector_db);
    if (rag.api_key) formData.append("api_key", rag.api_key);
    if (rag.url) formData.append("url", rag.url);
    if (rag.vector_db === "Qdrant") {
      formData.append("search_type", rag.search_type || "dense");
      formData.append("dense_vector_name", rag.dense_vector_name || "text-dense");
      formData.append("sparse_vector_name", rag.sparse_vector_name || "text-sparse");
    }

    try {
      await axios.post("http://localhost:8000/vector-db/indexes", formData);
      setSuccess("Index created successfully!");
      setTimeout(() => {
        setStep(2);
        setSuccess("");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create index");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }
    setIsIndexing(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("index_name", indexName);
    formData.append("embedding_model", embeddingModel);
    formData.append("vector_db", rag.vector_db);
    if (rag.api_key) formData.append("api_key", rag.api_key);
    if (rag.url) formData.append("url", rag.url);
    formData.append("chunk_size", chunkSize);
    formData.append("chunk_overlap", overlap);

    try {
      const resp = await axios.post("http://localhost:8000/vector-db/upload", formData);
      setSuccess(`Success! Indexed ${resp.data.chunks} chunks.`);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleDeleteIndex = async () => {
    if (!window.confirm("Are you sure you want to delete this index?")) return;
    setIsDeleting(true);
    try {
      await axios.delete(`http://localhost:8000/vector-db/indexes/${indexName}`, {
        params: {
          vector_db: rag.vector_db,
          api_key: rag.api_key,
          url: rag.url
        }
      });
      onClose();
    } catch (err) {
      setError("Failed to delete index");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialIndex ? `Manage Index: ${initialIndex}` : "Create New Knowledge Base"}
    >
      <div className="space-y-6">
        {/* Progress bar */}
        {!initialIndex && (
            <div className="flex gap-2 mb-8">
                <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}></div>
                <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`}></div>
            </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm border border-green-100">
            <Check className="w-4 h-4" /> {success}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>Index Name</Label>
              <Input 
                placeholder="e.g. documentation-v1" 
                value={indexName}
                onChange={(e) => setIndexName(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Lowercase alphanumeric and hyphens only</p>
            </div>
            <div className="space-y-2">
              <Label>Dimension</Label>
              <Input 
                type="number" 
                value={dimension}
                onChange={(e) => setDimension(parseInt(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">Auto-detected for: {embeddingModel}. You can manually override this if needed.</p>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleCreateIndex} disabled={isCreating || !indexName}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create & Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-4 bg-muted/5 hover:bg-muted/10 transition-colors relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => setFile(e.target.files[0])}
                accept=".pdf"
              />
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">{file ? file.name : "Click or drag PDF to upload"}</p>
                <p className="text-sm text-muted-foreground">The file will be chunked and indexed into <b>{indexName}</b></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Chunk Size</Label>
                 <Input type="number" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} />
               </div>
               <div className="space-y-2">
                 <Label>Overlap</Label>
                 <Input type="number" value={overlap} onChange={(e) => setOverlap(e.target.value)} />
               </div>
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              {initialIndex && rag.vector_db === "Pinecone" ? (
                 <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDeleteIndex} disabled={isDeleting || isIndexing}>
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {isDeleting ? "Deleting..." : "Delete Index"}
                 </Button>
              ) : <div />}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isIndexing || isDeleting}>Done</Button>
                <Button onClick={handleUpload} disabled={isIndexing || isDeleting || !file}>
                  {isIndexing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                  {isIndexing ? "Indexing..." : "Upload & Index"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
