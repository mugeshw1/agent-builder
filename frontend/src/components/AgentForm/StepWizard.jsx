import React, { useState } from "react";
import Step1_BasicConfig from "./Step1_BasicConfig";
import Step2_PromptConfig from "./Step2_PromptConfig";
import Step3_RAGConfig from "./Step3_RAGConfig";
import Step4_OutputConfig from "./Step4_OutputConfig";
import { Button } from "../ui/button";
import { ChevronRight, ChevronLeft, Save, AlertCircle } from "lucide-react";
import { useAgentStore } from "../../store";
import axios from "axios";

const steps = [
  { id: 1, title: "Basic Config", component: Step1_BasicConfig },
  { id: 2, title: "Prompt Config", component: Step2_PromptConfig },
  { id: 3, title: "RAG Config", component: Step3_RAGConfig },
  { id: 4, title: "Output Config", component: Step4_OutputConfig },
];

export default function StepWizard({ onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const { agentConfig, isSlugValid, errors, setErrors, isExistingAgent, setIsExistingAgent } = useAgentStore();
  const [loading, setLoading] = useState(false);

  const getStepErrors = (stepId) => {
    if (!errors) return 0;
    const errorKeys = Object.keys(errors);
    if (stepId === 1) {
      return errorKeys.filter(k => k.startsWith("llm.") || k === "name" || k === "slug").length;
    }
    if (stepId === 2) {
      return errorKeys.filter(k => k.startsWith("prompt.")).length;
    }
    if (stepId === 3) {
      return errorKeys.filter(k => k.startsWith("rag.")).length;
    }
    if (stepId === 4) {
      return errorKeys.filter(k => k.startsWith("output.")).length;
    }
    return 0;
  };

  const hasPreviousErrors = () => {
    for (let i = 1; i < currentStep; i++) {
        if (getStepErrors(i) > 0) return true;
    }
    return false;
  };

  const next = () => {
    // Basic frontend validation
    if (currentStep === 1 && (!agentConfig.name || !agentConfig.slug || !isSlugValid)) {
      setErrors({ ...errors, name: !agentConfig.name ? "Required" : null, slug: !agentConfig.slug || !isSlugValid ? "Invalid or taken" : null });
      return;
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const back = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSave = async () => {
    setLoading(true);
    setErrors({}); // Clear previous errors
    try {
      // 1. Validate with Backend first
      const valResp = await axios.post("http://localhost:8000/agents/validate", agentConfig);
      
      if (!valResp.data.valid) {
        setErrors(valResp.data.errors);
        setLoading(false);
        return;
      }

      if (isExistingAgent) {
        // Update existing agent
        await axios.put(`http://localhost:8000/agents/${agentConfig.id}`, agentConfig);
      } else {
        // Create new agent
        await axios.post("http://localhost:8000/agents/", agentConfig);
        setIsExistingAgent(true);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Failed to save agent. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  const isEditing = isExistingAgent;

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10 -translate-y-1/2"></div>
        {steps.map((step) => {
          const stepErrorCount = getStepErrors(step.id);
          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative ${
                  currentStep >= step.id 
                  ? "bg-primary border-primary text-white scale-110" 
                  : "bg-background border-muted text-muted-foreground"
                } ${stepErrorCount > 0 ? "border-destructive shake-animation" : ""}`}
              >
                {step.id}
                {stepErrorCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center animate-bounce">
                    !
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold ${currentStep === step.id ? "text-primary" : stepErrorCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Please fix the errors in the highlighted steps before saving.
          </div>
        )}
        <CurrentStepComponent />
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={back} 
          disabled={currentStep === 1 || loading}
          className={`relative ${hasPreviousErrors() ? "border-destructive text-destructive hover:bg-destructive/5" : ""}`}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
          {hasPreviousErrors() && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
          )}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={next} disabled={loading || (currentStep === 1 && !isSlugValid)}>
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={loading || !isSlugValid} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 px-8">
            <Save className="w-4 h-4 mr-2" /> {loading ? "Validating..." : isEditing ? "Update Agent" : "Create Agent"}
          </Button>
        )}
      </div>
    </div>
  );
}
