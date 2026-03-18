import React, { useState, useEffect } from "react";
import { useAgentStore } from "../../store";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { Plus, Settings2, RefreshCw, Loader2, Check, FileJson } from "lucide-react";
import axios from "axios";
import RagManager from "./RagManager";
import { Modal } from "../ui/modal";

export default function Step3_RAGConfig() {
  const { agentConfig, updateConfig, errors } = useAgentStore();
  const rag = agentConfig.rag;

  const [indexes, setIndexes] = useState([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [managerInitialIndex, setManagerInitialIndex] = useState(null);
  const [showDbConfig, setShowDbConfig] = useState(false);

  const fetchIndexes = async () => {
    if (!rag.enabled) return;
    setLoadingIndexes(true);
    try {
      const resp = await axios.get("http://localhost:8000/vector-db/indexes", {
        params: {
          api_key: rag.api_key,
          vector_db: rag.vector_db,
          url: rag.url
        }
      });
      setIndexes(resp.data.indexes);
    } catch (error) {
      console.error("Failed to fetch indexes:", error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  useEffect(() => {
    fetchIndexes();
  }, [rag.enabled, rag.api_key, rag.vector_db, rag.url]);

  const handleChange = (field, value) => {
    if (field === "index_name" && value === "CREATE_NEW") {
      setManagerInitialIndex(null);
      setShowManager(true);
      return;
    }
    updateConfig("rag", { [field]: value });
  };

  const openManageIndex = (e, indexName) => {
    e.preventDefault();
    e.stopPropagation();
    setManagerInitialIndex(indexName);
    setShowManager(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 border rounded-xl bg-card shadow-sm">
        <div className="space-y-0.5">
          <Label className="text-lg font-semibold">Enable RAG</Label>
          <p className="text-sm text-muted-foreground">
            Allow the agent to search your external knowledge base.
          </p>
        </div>
        <Switch
          checked={rag.enabled}
          onCheckedChange={(checked) => handleChange("enabled", checked)}
        />
      </div>

      {rag.enabled && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-4 p-6 border rounded-xl bg-card shadow-sm">
            <div className="space-y-2">
              <Label>Vector Database</Label>
              <div className="flex gap-2">
                <Select
                  value={rag.vector_db}
                  onChange={(e) => handleChange("vector_db", e.target.value)}
                  className="flex-1"
                >
                  <option value="Pinecone">Pinecone</option>
                  <option value="Qdrant">Qdrant</option>
                  <option value="Weaviate">Weaviate</option>
                  <option value="Azure">Azure AI Search</option>
                  <option value="AWS">Amazon OpenSearch</option>
                  <option value="Vertex">Vertex AI Vector Search</option>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowDbConfig(true)}
                  className="shrink-0 gap-2"
                >
                  <Settings2 className="w-4 h-4" />
                  Configure
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Embedding Model</Label>
              </div>
              <Select
                value={rag.embedding_model}
                onChange={(e) => handleChange("embedding_model", e.target.value)}
              >
                <optgroup label="OpenAI">
                  <option value="text-embedding-3-small">text-embedding-3-small (1536)</option>
                  <option value="text-embedding-3-large">text-embedding-3-large (3072)</option>
                  <option value="text-embedding-ada-002">text-embedding-ada-002 (1536)</option>
                </optgroup>
                <optgroup label="Google Gemini">
                  <option value="gemini-embedding-001">gemini-embedding-001 (768)</option>
                </optgroup>
              </Select>
            </div>
          </div>

          <div className="space-y-8 p-6 border rounded-xl bg-card shadow-sm">
            <div className="space-y-4">
              <Label>Top-K Results: {rag.top_k}</Label>
              <Slider
                min={1} max={20} step={1}
                value={[rag.top_k]}
                onValueChange={([val]) => handleChange("top_k", val)}
              />
              <p className="text-xs text-muted-foreground">Number of chunks to retrieve per query.</p>
            </div>

            <div className="space-y-4">
              <Label>Similarity Threshold: {rag.similarity_threshold}</Label>
              <Slider
                min={0} max={1} step={0.05}
                value={[rag.similarity_threshold]}
                onValueChange={([val]) => handleChange("similarity_threshold", val)}
              />
              <p className="text-xs text-muted-foreground">Minimum confidence score to include a chunk.</p>
            </div>
          </div>
        </div>
      )}

      <VectorDbSettingsModal
        isOpen={showDbConfig}
        onClose={() => setShowDbConfig(false)}
        rag={rag}
        handleChange={handleChange}
        indexes={indexes}
        fetchIndexes={fetchIndexes}
        loadingIndexes={loadingIndexes}
        openManageIndex={openManageIndex}
      />

      <RagManager
        isOpen={showManager}
        onClose={() => {
          setShowManager(false);
          fetchIndexes();
        }}
        initialIndex={managerInitialIndex}
        rag={rag}
      />
    </div>
  );
}

function VectorDbSettingsModal({ isOpen, onClose, rag, handleChange, indexes, fetchIndexes, loadingIndexes, openManageIndex }) {
  const { errors } = useAgentStore();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${rag.vector_db} Configuration`}>
      <div className="space-y-5 py-2">
        {rag.vector_db === "Pinecone" && (
          <>
            <div className="space-y-2">
              <Label className={errors["rag.api_key"] ? "text-destructive" : ""}>Pinecone API Key</Label>
              <Input
                type="password"
                placeholder="Enter Pinecone API Key"
                className={errors["rag.api_key"] ? "border-destructive focus-visible:ring-destructive" : ""}
                value={rag.api_key}
                onChange={(e) => handleChange("api_key", e.target.value)}
              />
              {errors["rag.api_key"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.api_key"]}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pinecone Index</Label>
                <button
                  onClick={fetchIndexes}
                  className="text-[10px] flex items-center gap-1 hover:text-primary transition-colors text-muted-foreground font-bold"
                >
                  {loadingIndexes ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                  SYNC
                </button>
              </div>
              <div className="flex gap-2">
                <Select
                  value={rag.index_name}
                  onChange={(e) => handleChange("index_name", e.target.value)}
                  className={`flex-1 ${errors["rag.index_name"] ? "border-destructive" : ""}`}
                >
                  <option value="">Select an index</option>
                  <option value="CREATE_NEW" className="font-bold text-primary italic">+ Create New Index</option>
                  {indexes.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </Select>
                {errors["rag.index_name"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.index_name"]}</p>}
                {rag.index_name && rag.index_name !== "CREATE_NEW" && (
                  <Button variant="outline" size="icon" onClick={(e) => openManageIndex(e, rag.index_name)}>
                    <Settings2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {rag.vector_db === "Qdrant" && (
          <>
            <div className="space-y-2">
              <Label className={errors["rag.url"] ? "text-destructive" : ""}>Qdrant Cluster URL</Label>
              <Input
                placeholder="Enter Qdrant Cluster URL"
                className={errors["rag.url"] ? "border-destructive focus-visible:ring-destructive" : ""}
                value={rag.url}
                onChange={(e) => handleChange("url", e.target.value)}
              />
              {errors["rag.url"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.url"]}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors["rag.api_key"] ? "text-destructive" : ""}>Qdrant API Key</Label>
              <Input
                type="password"
                placeholder="Enter Qdrant API Key"
                className={errors["rag.api_key"] ? "border-destructive focus-visible:ring-destructive" : ""}
                value={rag.api_key}
                onChange={(e) => handleChange("api_key", e.target.value)}
              />
              {errors["rag.api_key"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.api_key"]}</p>}
            </div>
            <div className="space-y-2">
              <Label>Search Type</Label>
              <Select
                value={rag.search_type || "dense"}
                onChange={(e) => handleChange("search_type", e.target.value)}
              >
                <option value="dense">Simple Single Embedding (Dense)</option>
                <option value="hybrid">Simple Hybrid (Dense + Sparse)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dense Vector Name</Label>
              <Input
                placeholder="e.g. text-dense"
                value={rag.dense_vector_name}
                onChange={(e) => handleChange("dense_vector_name", e.target.value)}
              />
            </div>

            {rag.search_type === "hybrid" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label>Sparse Vector Name</Label>
                <Input
                  placeholder="e.g. text-sparse"
                  value={rag.sparse_vector_name}
                  onChange={(e) => handleChange("sparse_vector_name", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className={errors["rag.index_name"] ? "text-destructive" : ""}>Collection Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. documentation_collection"
                  value={rag.index_name}
                  onChange={(e) => handleChange("index_name", e.target.value)}
                  className={`flex-1 ${errors["rag.index_name"] ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {rag.index_name && (
                  <Button variant="outline" size="icon" onClick={(e) => openManageIndex(e, rag.index_name)}>
                    <Settings2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {errors["rag.index_name"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.index_name"]}</p>}
            </div>
          </>
        )}

        {rag.vector_db === "Weaviate" && (
          <>
            <div className="space-y-2">
              <Label className={errors["rag.url"] ? "text-destructive" : ""}>Weaviate Cluster URL</Label>
              <Input
                placeholder="Enter Weaviate Cluster URL"
                className={errors["rag.url"] ? "border-destructive focus-visible:ring-destructive" : ""}
                value={rag.url}
                onChange={(e) => handleChange("url", e.target.value)}
              />
              {errors["rag.url"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.url"]}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors["rag.api_key"] ? "text-destructive" : ""}>Weaviate Admin API Key</Label>
              <Input
                type="password"
                placeholder="Enter Weaviate Admin API Key"
                className={errors["rag.api_key"] ? "border-destructive focus-visible:ring-destructive" : ""}
                value={rag.api_key}
                onChange={(e) => handleChange("api_key", e.target.value)}
              />
              {errors["rag.api_key"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.api_key"]}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors["rag.index_name"] ? "text-destructive" : ""}>Weaviate Collection (Class)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. MyCollection"
                  value={rag.index_name}
                  onChange={(e) => handleChange("index_name", e.target.value)}
                  className={`flex-1 ${errors["rag.index_name"] ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {rag.index_name && (
                  <Button variant="outline" size="icon" onClick={(e) => openManageIndex(e, rag.index_name)}>
                    <Settings2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {errors["rag.index_name"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["rag.index_name"]}</p>}
            </div>
          </>
        )}

        {rag.vector_db === "Azure" && (
          <>
            <div className="space-y-2">
              <Label>Azure Endpoint URL</Label>
              <Input
                placeholder="https://your-service.search.windows.net"
                value={rag.url}
                onChange={(e) => handleChange("url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Azure API Key</Label>
              <Input
                type="password"
                placeholder="Admin Key"
                value={rag.api_key}
                onChange={(e) => handleChange("api_key", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Index Name</Label>
              <Input
                placeholder="e.g. my-index"
                value={rag.index_name}
                onChange={(e) => handleChange("index_name", e.target.value)}
              />
            </div>
          </>
        )}

        {rag.vector_db === "AWS" && (
          <>
            <div className="space-y-2">
              <Label>Domain Endpoint (URL)</Label>
              <Input
                placeholder="https://vpc-dom-..."
                value={rag.url}
                onChange={(e) => handleChange("url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input
                placeholder="AKIA..."
                value={rag.aws_access_key}
                onChange={(e) => handleChange("aws_access_key", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <Input
                type="password"
                placeholder="Secret Key"
                value={rag.aws_secret_key}
                onChange={(e) => handleChange("aws_secret_key", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  placeholder="us-east-1"
                  value={rag.aws_region}
                  onChange={(e) => handleChange("aws_region", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Index Name</Label>
                <Input
                  placeholder="e.g. my-index"
                  value={rag.index_name}
                  onChange={(e) => handleChange("index_name", e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {rag.vector_db === "Vertex" && (
          <>
            <div className="space-y-2">
              <Label>Service Account JSON File</Label>
              {rag.gcp_service_account_json ? (
                <div className="flex items-center justify-between p-3 border rounded-xl bg-green-50/50 border-green-200 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span>Key loaded successfully</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleChange("gcp_service_account_json", "")}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="group relative">
                  <Input
                    type="file"
                    accept=".json"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          handleChange("gcp_service_account_json", event.target.result);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  <div className="border-2 border-dashed rounded-xl p-4 text-center group-hover:bg-muted/30 transition-all border-muted-foreground/20 group-hover:border-primary/50">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium">Click to upload .json key</p>
                    <p className="text-[10px] text-muted-foreground">Service Account Key required for Vertex AI</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project ID</Label>
                <Input
                  placeholder="my-gcp-project"
                  value={rag.gcp_project_id}
                  onChange={(e) => handleChange("gcp_project_id", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="us-central1"
                  value={rag.gcp_location}
                  onChange={(e) => handleChange("gcp_location", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Index ID (Name)</Label>
              <Input
                placeholder="e.g. 1234567890"
                value={rag.index_name}
                onChange={(e) => handleChange("index_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vector Data GCS Path</Label>
              <Input
                placeholder="gs://my-bucket/path"
                value={rag.gcp_gcs_path}
                onChange={(e) => handleChange("gcp_gcs_path", e.target.value)}
              />
            </div>
          </>
        )}
        <div className="pt-6 border-t mt-4 flex justify-end">
          <Button onClick={onClose} className="px-8 rounded-full">Save and Close</Button>
        </div>
      </div>
    </Modal>
  );
}
