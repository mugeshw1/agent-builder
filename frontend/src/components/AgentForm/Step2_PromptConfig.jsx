import React from "react";
import { useAgentStore } from "../../store";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function Step2_PromptConfig() {
  const { agentConfig, updateConfig, errors } = useAgentStore();
  const promptConfig = agentConfig.prompt;

  const handleChange = (field, value) => {
    updateConfig("prompt", { [field]: value });
  };

  const addFewShot = () => {
    handleChange("few_shot_examples", [
      ...promptConfig.few_shot_examples,
      { user: "", assistant: "" }
    ]);
  };

  const updateFewShot = (index, role, value) => {
    const newEx = [...promptConfig.few_shot_examples];
    newEx[index][role] = value;
    handleChange("few_shot_examples", newEx);
  };

  const removeFewShot = (index) => {
    const newEx = promptConfig.few_shot_examples.filter((_, i) => i !== index);
    handleChange("few_shot_examples", newEx);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 shadow-sm border p-6 rounded-xl bg-card">
        <h3 className="text-lg font-semibold border-b pb-2">System Prompt</h3>
        <div className="space-y-2">
          <Label className={errors["prompt.system_prompt"] ? "text-destructive" : ""}>System Instructions</Label>
          <Textarea
            className={`min-h-[150px] ${errors["prompt.system_prompt"] ? "border-destructive focus-visible:ring-destructive" : ""}`}
            placeholder="You are a helpful assistant..."
            value={promptConfig.system_prompt}
            onChange={(e) => handleChange("system_prompt", e.target.value)}
          />
          {errors["prompt.system_prompt"] && <p className="text-[10px] text-destructive font-semibold uppercase">{errors["prompt.system_prompt"]}</p>}
        </div>
      </div>

      <div className="space-y-4 shadow-sm border p-6 rounded-xl bg-card">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">Few-shot Examples</h3>
          <Button variant="outline" size="sm" onClick={addFewShot} type="button">
            <Plus className="w-4 h-4 mr-2" /> Add Example
          </Button>
        </div>

        {promptConfig.few_shot_examples.length === 0 && (
          <div className="text-center text-muted-foreground py-4 text-sm">
            No examples added. Click "Add Example" to train the model's tone.
          </div>
        )}

        <div className="space-y-4">
          {promptConfig.few_shot_examples.map((ex, idx) => (
            <div key={idx} className="flex gap-4 items-start p-4 border rounded-md relative group">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>User Message</Label>
                  <Textarea
                    value={ex.user}
                    onChange={(e) => updateFewShot(idx, "user", e.target.value)}
                    placeholder="User question here..."
                    className="min-h-[60px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assistant Response</Label>
                  <Textarea
                    value={ex.assistant}
                    onChange={(e) => updateFewShot(idx, "assistant", e.target.value)}
                    placeholder="Ideal assistant answer here..."
                    className="min-h-[60px]"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFewShot(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
