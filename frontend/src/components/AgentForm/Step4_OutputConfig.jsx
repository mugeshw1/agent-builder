import React from "react";
import { useAgentStore } from "../../store";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";

export default function Step4_OutputConfig() {
  const { agentConfig, updateConfig } = useAgentStore();
  const output = agentConfig.output;

  const handleChange = (field, value) => {
    updateConfig("output", { [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
        <h3 className="text-lg font-semibold border-b pb-2">Response Format</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Preferred Format</Label>
            <Select
              value={output.format}
              onChange={(e) => handleChange("format", e.target.value)}
            >
              <option value="Plain text">Plain text</option>
              <option value="JSON">JSON</option>
              <option value="Markdown">Markdown</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Output Length (Tokens)</Label>
            <Input
              type="number"
              value={output.max_length}
              onChange={(e) => handleChange("max_length", parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
