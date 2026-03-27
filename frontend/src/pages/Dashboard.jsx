import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { Button } from "../components/ui/button";
import AgentCard from "../components/AgentCard";
import StepWizard from "../components/AgentForm/StepWizard";
import ChatPanel from "../components/ChatPanel";
import { Plus, LayoutGrid, Search, Loader2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { useAgentStore } from "../store";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list or create
  const [activeTestAgent, setActiveTestAgent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { resetConfig, setConfig } = useAgentStore();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE_URL}/agents/`);
      setAgents(resp.data);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/agents/${id}`);
      fetchAgents();
    } catch (error) {
      alert("Error deleting agent");
    }
  };

  const startCreate = () => {
    resetConfig();
    setView("create");
  };

  const handleEdit = (agent) => {
    setConfig(agent);
    setView("create");
  };

  const filteredAgents = agents.filter(a =>
    (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent pb-1.5">
            Agent Configuration Studio
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Build, configure and test your AI fleet.</p>
        </div>

        {view === "list" && (
          <Button onClick={startCreate} className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 flex gap-2 text-base">
            <Plus className="w-5 h-5" /> Build New Agent
          </Button>
        )}

        {view === "create" && (
          <Button variant="outline" onClick={() => setView("list")} className="rounded-full">
            Back to Dashboard
          </Button>
        )}
      </div>

      {view === "list" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-10 h-10 rounded-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-medium animate-pulse">Retrieving your agents...</p>
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onDelete={handleDelete}
                  onTest={setActiveTestAgent}
                  onEdit={handleEdit}
                  onRefresh={fetchAgents}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 border-2 border-dashed rounded-3xl space-y-4 bg-muted/5">
              <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                <LayoutGrid className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold">No agents found</h3>
              <p className="text-muted-foreground">Get started by creating your first AI configuration.</p>
              <Button onClick={startCreate} variant="secondary" className="mt-4 rounded-full">
                Create Agent Now
              </Button>
            </div>
          )}
        </div>
      )}

      {view === "create" && (
        <div className="animate-in slide-in-from-bottom-8 duration-500">
          <StepWizard onSuccess={() => {
            setView("list");
            fetchAgents();
          }} />
        </div>
      )}

      {/* Floating Chat Overlay */}
      {activeTestAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 shadow-2xl">
            <ChatPanel
              agent={activeTestAgent}
              onClose={() => setActiveTestAgent(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
