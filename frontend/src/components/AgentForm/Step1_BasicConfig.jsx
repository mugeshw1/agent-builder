import React, { useEffect, useState } from "react";
import { useAgentStore } from "../../store";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import axios from "axios";
import API_BASE_URL from "../../config";

const modelsByProvider = {
  OpenAI: ["gpt-5.2", "gpt-5.2-pro", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini", "o3", "o3-mini", "o4-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  Anthropic: ["claude-opus-4.6", "claude-sonnet-4.6", "claude-haiku-4.5", "claude-opus-4", "claude-sonnet-4", "claude-3-7-sonnet", "claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
  Gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-pro", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-pro"],
  Mistral: ["mistral-large-latest", "mistral-large-2407", "mistral-medium-latest", "mistral-medium", "mistral-small-latest", "mistral-small", "open-mixtral-8x7b", "open-mixtral-8x22b", "codestral-latest"],
};

export default function Step1_BasicConfig() {
  const { agentConfig, updateRootConfig, updateConfig, isSlugValid, setIsSlugValid, errors } = useAgentStore();
  const [isChecking, setIsChecking] = useState(false);

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (name) => {
    const data = { name };
    // Only auto-update slug if it's currently empty or matches the previous auto-generated one
    if (!agentConfig.slug || agentConfig.slug === generateSlug(agentConfig.name)) {
      data.slug = generateSlug(name);
    }
    updateRootConfig(data);
  };

  useEffect(() => {
    const checkSlug = async () => {
      if (!agentConfig.slug) return;
      setIsChecking(true);
      try {
        const resp = await axios.get(`${API_BASE_URL}/agents/validate-slug/${agentConfig.slug}`, {
          params: { exclude_id: agentConfig.id }
        });
        setIsSlugValid(resp.data.available);
      } catch (err) {
        console.error("Slug check failed:", err);
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(checkSlug, 500);
    return () => clearTimeout(timer);
  }, [agentConfig.slug, agentConfig.id, setIsSlugValid]);

  const handleProviderChange = (provider) => {
    const defaultModel = modelsByProvider[provider][0];
    updateConfig("llm", { provider, model: defaultModel });
  };

  const handlellmChange = (field, value) => {
    updateConfig("llm", { [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 shadow-sm border p-6 rounded-xl bg-card">
        <h3 className="text-lg font-semibold border-b pb-2">Basic Details</h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>Agent Name</Label>
            <Input
              id="name"
              placeholder="e.g. Customer Support AI"
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              value={agentConfig.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            {errors.name && <p className="text-[10px] text-destructive font-semibold uppercase">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className={!isSlugValid ? "text-destructive" : ""}>
              Custom URL Slug {!isSlugValid && "(Already Taken)"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
              <Input
                id="slug"
                placeholder="agent-slug"
                className={`pl-6 ${(!isSlugValid || errors.slug) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                value={agentConfig.slug}
                onChange={(e) => updateRootConfig({ slug: generateSlug(e.target.value) })}
              />
            </div>
            {(errors.slug || !isSlugValid) && <p className="text-[10px] text-destructive font-semibold uppercase">{errors.slug || "Slug is already taken"}</p>}
            <p className="text-[10px] text-muted-foreground">
              This will be your agent's unique web address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this agent do?"
              value={agentConfig.description}
              onChange={(e) => updateRootConfig({ description: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 shadow-sm border p-6 rounded-xl bg-card">
        <h3 className="text-lg font-semibold border-b pb-2">LLM Configuration</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={agentConfig.llm.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              <option value="OpenAI">OpenAI</option>
              <option value="Anthropic">Anthropic</option>
              <option value="Gemini">Gemini</option>
              <option value="Mistral">Mistral</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model Name</Label>
            <Select
              value={agentConfig.llm.model}
              onChange={(e) => handlellmChange("model", e.target.value)}
            >
              {modelsByProvider[agentConfig.llm.provider]?.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </Select>
          </div>


          <div className="space-y-2">
            <Label className={errors["llm.api_key"] ? "text-destructive" : ""}>API Key (Optional / Env fallback)</Label>
            <Input
              type="password"
              placeholder="Enter API Key"
              className={errors["llm.api_key"] ? "border-destructive focus-visible:ring-destructive" : ""}
              value={agentConfig.llm.api_key}
              onChange={(e) => handlellmChange("api_key", e.target.value)}
            />
            {errors["llm.api_key"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["llm.api_key"]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={agentConfig.llm.temperature}
                onChange={(e) => handlellmChange("temperature", parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={agentConfig.llm.max_tokens}
                onChange={(e) => handlellmChange("max_tokens", parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
