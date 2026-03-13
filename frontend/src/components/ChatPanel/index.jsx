import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Send, X, Bot, User, Clock, Database, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";

export default function ChatPanel({ agent, onClose, isPublic = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const [sessionId] = useState(() => {
    // Unique ID for this specific component instance (resets on refresh/unmount)
    return Math.random().toString(36).substring(7) + Date.now();
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await axios.post(`http://localhost:8000/agents/${agent.id}/chat`, {
        message: input,
        session_id: sessionId,
      });

      const aiMsg = {
        role: "ai",
        text: resp.data.response,
        latency: resp.data.latency_ms,
        retrieved: resp.data.retrieved_chunks || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error: Failed to connect to the agent backend.", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col bg-background relative overflow-hidden ${isPublic ? 'h-full' : 'h-[600px] border rounded-2xl shadow-2xl border-primary/20'}`}>
      {isPublic && (
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes fadeInOnly {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .msg-fade-in {
            animation: fadeInOnly 0.6s ease-out forwards;
          }
        `}</style>
      )}
      {/* Header */}
      {!isPublic && (
        <div className="p-4 border-b flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="text-primary w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{agent.name}</h3>
              {!isPublic && <p className="text-xs text-muted-foreground uppercase">{agent.llm.model}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar ${isPublic ? 'bg-transparent pt-16 hide-scrollbar' : 'bg-slate-50/30 dark:bg-slate-900/10'}`}
      >
        {!isPublic && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
            <Bot className="w-12 h-12 mb-2" />
            <p className="font-medium">Test your agent here</p>
            <p className="text-sm">Send a message to see how the agent responds.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col w-full ${isPublic ? 'msg-fade-in' : ''}`}
          >
            {/* Main Message Row (Icon + Bubble) */}
            <div className={`flex items-center gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar Icon */}
              <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${msg.role === "user" ? "bg-white border text-black" : "bg-white border text-slate-600"
                }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-blue-500 text-primary-foreground rounded-tr-none"
                  : msg.isError
                    ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-none"
                    : "bg-white dark:bg-card border border-primary/5 rounded-tl-none shadow-md shadow-primary/5"
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>

            {/* Metadata (Latency, Chunks) - Positioned below the bubble and aligned */}
            {msg.role === "ai" && (
              <div className={`mt-2 flex flex-wrap gap-3 items-center ml-11 max-w-[85%]`}>
                {!isPublic && msg.latency && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border">
                    <Clock className="w-3 h-3" /> {Math.round(msg.latency)}ms
                  </div>
                )}
                {!isPublic && msg.retrieved?.length > 0 && (
                  <details className="group">
                    <summary className="list-none flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors w-fit">
                      <Database className="w-3 h-3" /> {msg.retrieved.length} Chunks
                      <ChevronDown className="w-3 h-3 group-open:hidden" />
                      <ChevronUp className="w-3 h-3 hidden group-open:block" />
                    </summary>
                    <div className="mt-2 w-full bg-slate-50 dark:bg-slate-900/50 border rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                        Retrieved Knowledge
                      </p>
                      {msg.retrieved.map((chunk, cidx) => (
                        <div key={cidx} className="p-3 bg-white dark:bg-card rounded-lg border border-primary/5 text-xs shadow-sm shadow-primary/5">
                          <p className="leading-relaxed italic text-slate-700 dark:text-slate-300">"{chunk.content}"</p>
                          {chunk.metadata?.source && (
                            <p className="mt-2 text-[9px] font-bold opacity-40 uppercase">Source: {chunk.metadata.source}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Bot className="text-primary w-4 h-4" />
            </div>
            <div className="flex gap-1.5 p-3 rounded-2xl bg-white dark:bg-card border border-primary/5 rounded-tl-none self-start items-center">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-150"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-225"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t bg-card shrink-0">
        <div className="flex gap-2 relative">
          <Input
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`flex-1 h-12 px-4 pr-12 rounded-full border-primary/10 focus-visible:ring-primary shadow-inner ${isPublic ? 'bg-white' : 'bg-slate-50/50'}`}
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
            disabled={!input.trim() || loading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
