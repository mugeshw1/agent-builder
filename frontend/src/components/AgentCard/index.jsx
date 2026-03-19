import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Settings, Play, Trash2, Rocket, ExternalLink, Power } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../../config";

export default function AgentCard({ agent, onEdit, onDelete, onTest, onRefresh }) {
  const [loading, setLoading] = useState(false);

  const handleDeploy = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/agents/${agent.id}/deploy`);
      onRefresh();
    } catch (err) {
      alert("Deployment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("Deactivate this agent? It will no longer be accessible via the public link.")) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/agents/${agent.id}/deactivate`);
      onRefresh();
    } catch (err) {
      alert("Deactivation failed");
    } finally {
      setLoading(false);
    }
  };

  const openPublicChat = () => {
    window.open(`${window.location.origin}/${agent.slug}/chat`, "_blank");
  };

  return (
    <Card className="hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col h-[340px]">
      {agent.is_deployed && (
        <div className="absolute top-0 right-0 p-2 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Active
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-xl group-hover:text-primary transition-colors truncate pr-16">{agent.name}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[40px] text-sm">{agent.description || "No description provided."}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-grow p-4 pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mb-4">
          <span className="font-semibold px-2 py-0.5 bg-muted rounded text-[11px] uppercase">{agent.llm.provider}</span>
          <span className="truncate max-w-[120px]">{agent.llm.model}</span>
        </div>

        {agent.is_deployed && (
          <div className="flex-grow flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-4 rounded-full text-xs font-bold gap-2 text-primary hover:bg-primary/5 border border-primary/20 shadow-sm"
              onClick={openPublicChat}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ask Agent
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 p-4 border-t mt-auto shrink-0 bg-slate-50/50">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-9 bg-background"
          onClick={() => onTest(agent)}
        >
          <Play className="w-3.5 h-3.5 mr-2" /> Test
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-9 bg-background"
          onClick={() => onEdit(agent)}
        >
          <Settings className="w-3.5 h-3.5 mr-2" /> Edit
        </Button>
        <Button
          size="sm"
          variant={agent.is_deployed ? "outline" : "outline"}
          disabled={loading}
          className={`w-full h-9 font-medium shadow-none transition-all ${agent.is_deployed
            ? 'text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive'
            : 'text-muted-foreground hover:text-primary bg-background'
            }`}
          onClick={agent.is_deployed ? handleDeactivate : handleDeploy}
        >
          {agent.is_deployed ? <Power className="w-3.5 h-3.5 mr-2" /> : <Rocket className="w-3.5 h-3.5 mr-2" />}
          {loading ? "..." : (agent.is_deployed ? "Deactivate" : "Deploy")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20 transition-colors bg-background"
          onClick={() => onDelete(agent.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
