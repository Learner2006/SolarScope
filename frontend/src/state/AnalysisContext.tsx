import { createContext, useContext, useState, ReactNode } from "react";
import {
  AnalysisResponse,
  ScenarioRequest,
  ScenarioResponse,
  ScopeInput,
} from "../types/analysis";
import { createAnalysis, createScenario as apiCreateScenario, ApiError } from "../services/api";

export type ScreenName = "landing" | "scope" | "analysis" | "scenarios" | "report" | "methodology";

export type ExecutionStage =
  | "idle"
  | "validating"
  | "fetching_data"
  | "aggregating"
  | "calculating_financials"
  | "complete"
  | "error";

interface AnalysisContextValue {
  activeScreen: ScreenName;
  navigateTo: (screen: ScreenName) => void;
  currentAnalysis: AnalysisResponse | null;
  executionStage: ExecutionStage;
  executionError: string | null;
  selectedMonthForDrilldown: number | null;
  setSelectedMonthForDrilldown: (m: number | null) => void;
  runAnalysis: (scope: ScopeInput, forceFixture?: boolean) => Promise<void>;
  runScenario: (request: ScenarioRequest) => Promise<ScenarioResponse | null>;
  resetToScope: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenName>("landing");
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResponse | null>(null);
  const [executionStage, setExecutionStage] = useState<ExecutionStage>("idle");
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [selectedMonthForDrilldown, setSelectedMonthForDrilldown] = useState<number | null>(null);

  const navigateTo = (screen: ScreenName) => {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runAnalysis = async (scope: ScopeInput, forceFixture = false) => {
    setExecutionError(null);
    setExecutionStage("validating");

    try {
      // UX Decision / Perceived Execution Flow:
      // Local FastAPI analysis executes in ~30ms. We introduce brief micro-delays (200ms)
      // across stages ("validating" -> "fetching_data" -> "calculating_financials") so users can
      // visually track the pipeline execution rather than experiencing a disorienting 0ms flash of content.
      await new Promise((r) => setTimeout(r, 200));

      setExecutionStage("fetching_data");
      const result = await createAnalysis(scope, forceFixture);

      setExecutionStage("calculating_financials");
      await new Promise((r) => setTimeout(r, 200));

      setCurrentAnalysis(result);
      setExecutionStage("complete");
      // Default interactive diurnal chart to the highest-yielding month for immediate insight.
      setSelectedMonthForDrilldown(result.generation.strongest_month.month);
      setActiveScreen("analysis");
    } catch (err: any) {
      setExecutionStage("error");
      if (err instanceof ApiError) {
        setExecutionError(err.detail || err.message);
      } else {
        setExecutionError(err.message || "An unexpected error occurred during execution.");
      }
    }
  };

  const runScenario = async (request: ScenarioRequest): Promise<ScenarioResponse | null> => {
    if (!currentAnalysis) return null;
    try {
      setExecutionError(null);
      const scenarioRes = await apiCreateScenario(currentAnalysis.analysis_id, request);
      // Update local analysis state to include this scenario without mutating baseline
      setCurrentAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarios: {
            ...prev.scenarios,
            [scenarioRes.scenario_id]: scenarioRes,
          },
        };
      });
      return scenarioRes;
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setExecutionError(
          "Analysis session expired or was evicted from repository memory. Please return to Scope and re-run the simulation."
        );
      } else if (err instanceof ApiError && err.status === 409) {
        setExecutionError(
          `Scenario conflict: ${err.detail || "A scenario with this identifier already exists."}`
        );
      } else {
        setExecutionError(err.detail || err.message || "Scenario evaluation failed.");
      }
      return null;
    }
  };

  const resetToScope = () => {
    setActiveScreen("scope");
  };

  return (
    <AnalysisContext.Provider
      value={{
        activeScreen,
        navigateTo,
        currentAnalysis,
        executionStage,
        executionError,
        selectedMonthForDrilldown,
        setSelectedMonthForDrilldown,
        runAnalysis,
        runScenario,
        resetToScope,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
