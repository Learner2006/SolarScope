import { useState } from "react";
import { useAnalysis } from "../state/AnalysisContext";
import { ScenarioRequest, ScenarioResponse } from "../types/analysis";

export function useScenarios() {
  const { currentAnalysis, runScenario } = useAnalysis();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const executeScenario = async (request: ScenarioRequest): Promise<ScenarioResponse | null> => {
    // If preset scenario was already evaluated, activate it without submitting duplicate request
    const existing = currentAnalysis?.scenarios?.[request.scenario_id];
    if (existing) {
      setActiveScenarioId(request.scenario_id);
      return existing;
    }

    setIsSubmitting(true);
    try {
      const res = await runScenario(request);
      if (res) {
        setActiveScenarioId(res.scenario_id);
      }
      return res;
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentScenariosList: ScenarioResponse[] = currentAnalysis?.scenarios
    ? Object.values(currentAnalysis.scenarios)
    : [];

  const selectedScenario = activeScenarioId
    ? currentAnalysis?.scenarios[activeScenarioId] || currentScenariosList[0] || null
    : currentScenariosList[0] || null;

  return {
    scenarios: currentScenariosList,
    selectedScenario,
    activeScenarioId,
    setActiveScenarioId,
    executeScenario,
    isSubmitting,
  };
}
