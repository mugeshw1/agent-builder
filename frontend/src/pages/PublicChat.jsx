import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config";
import ChatPanel from "../components/ChatPanel";
import {
  Loader2, AlertCircle, Home, MessageSquare,
  Database, Upload, FileText, Check, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function PublicChat() {
  const { agentSlug } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");

  // RAG upload state
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchAgent = async () => {
      setLoading(true);
      try {
        const resp = await axios.get(`${API_BASE_URL}/agents/${agentSlug}`);
        const agentData = resp.data;

        if (!agentData.is_deployed) {
          setError("This agent is not currently live. Please contact the administrator.");
        } else {
          setAgent(agentData);
        }
      } catch (err) {
        setError("Could not find the requested AI agent.");
        console.error("Error fetching public agent:", err);
      } finally {
        setLoading(false);
      }
    };

    if (agentSlug) {
      fetchAgent();
    }
  }, [agentSlug]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !agent.rag.enabled) return;

    setIsUploading(true);
    setUploadStatus({ type: "", message: "" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("index_name", agent.rag.index_name);
    formData.append("embedding_model", agent.rag.embedding_model);
    formData.append("vector_db", agent.rag.vector_db || "Pinecone");
    if (agent.rag.url) {
      formData.append("url", agent.rag.url);
    }
    formData.append("chunk_size", 1000);
    formData.append("chunk_overlap", 200);

    try {
      const resp = await axios.post(`${API_BASE_URL}/vector-db/upload`, formData);
      setUploadStatus({
        type: "success",
        message: `Indexed ${resp.data.chunks} chunks successfully.`
      });
      setFile(null);
    } catch (err) {
      setUploadStatus({
        type: "error",
        message: err.response?.data?.detail || "Failed to upload file"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="font-medium text-muted-foreground animate-pulse">Launching AI Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">{error}</p>
        <Button onClick={() => navigate("/")} variant="outline" className="rounded-full gap-2">
          <Home className="w-4 h-4" /> Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - always shown for consistent branding */}
      <aside className="w-64 border-r bg-slate-50 flex flex-col pt-6">
        <div className="px-6 mb-8 mt-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <MessageSquare className="text-white w-6 h-6" />
          </div>
          <h2 className="font-extrabold text-xl tracking-tight text-slate-800 line-clamp-2 leading-tight">
            {agent.name}
          </h2>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "chat"
                ? "bg-white text-primary shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/50"
              }`}
          >
            <MessageSquare className={`w-4 h-4 ${activeTab === "chat" ? "text-primary" : "text-slate-400"}`} />
            Chat Assistant
          </button>

          {agent.rag.enabled && (
            <button
              onClick={() => setActiveTab("knowledge")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "knowledge"
                  ? "bg-white text-primary shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-200/50"
                }`}
            >
              <Database className={`w-4 h-4 ${activeTab === "knowledge" ? "text-primary" : "text-slate-400"}`} />
              Knowledge Base
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Button
            variant="ghost"
            className="w-full justify-start text-xs text-muted-foreground hover:text-primary gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="w-3.5 h-3.5" /> Back to Studio
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        {activeTab === "chat" ? (
          <div className="flex-1 h-full max-w-5xl mx-auto w-full px-4 lg:px-8">
            <div className="h-full pt-4 pb-8">
              <ChatPanel
                agent={agent}
                onClose={() => navigate("/")}
                isPublic={true}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center w-full p-8 lg:p-12">
            <div className="space-y-8 w-full max-w-3xl">

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                  <Database size={160} />
                </div>

                <div className="space-y-6 relative">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4 bg-white/50 hover:bg-white hover:border-primary/40 transition-all group relative cursor-pointer">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          setFile(files[0]);
                          setUploadStatus({ type: "", message: "" });
                        }
                      }}
                      accept=".pdf"
                      disabled={isUploading}
                    />
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-primary/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg text-slate-700">
                        {file ? file.name : "Choose a collection of knowledge"}
                      </p>
                      <p className="text-slate-400">
                        Drop your PDF file here (maximum 20MB)
                      </p>
                    </div>
                    {file && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        className="mt-2 text-xs font-bold text-destructive hover:underline uppercase tracking-wider"
                      >
                        Remove selection
                      </button>
                    )}
                  </div>

                  {uploadStatus.message && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in zoom-in-95 duration-200 ${uploadStatus.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-destructive/5 text-destructive border border-destructive/10"
                      }`}>
                      {uploadStatus.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span className="font-semibold">{uploadStatus.message}</span>
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    <Button
                      onClick={handleFileUpload}
                      disabled={isUploading || !file}
                      className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 flex gap-2 text-base font-bold flex-1"
                    >
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                      {isUploading ? "Indexing Content..." : "Build Knowledge Index"}
                    </Button>
                  </div>
                </div>
              </div>


            </div>
          </div>
        )}
      </main>
    </div>
  );
}
