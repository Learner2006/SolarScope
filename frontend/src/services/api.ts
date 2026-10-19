import {
  AnalysisResponse,
  AnalysisSummary,
  ReportResponse,
  ScenarioRequest,
  ScenarioResponse,
  ScopeInput,
} from "../types/analysis";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson.detail || JSON.stringify(errJson);
    } catch {
      detail = await res.text();
    }
    throw new ApiError(detail || `Request failed with status ${res.status}`, res.status, detail);
  }
  return res.json();
}

export async function checkHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

export async function createAnalysis(scope: ScopeInput, forceFixture = false): Promise<AnalysisResponse> {
  const query = forceFixture ? "?force_fixture=true" : "";
  const res = await fetch(`${API_BASE}/analyses${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scope),
  });
  return handleResponse<AnalysisResponse>(res);
}

export async function getAnalysis(analysisId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}`);
  return handleResponse<AnalysisResponse>(res);
}

export async function listAnalyses(): Promise<AnalysisSummary[]> {
  const res = await fetch(`${API_BASE}/analyses`);
  return handleResponse<AnalysisSummary[]>(res);
}

export async function createScenario(
  analysisId: string,
  scenario: ScenarioRequest
): Promise<ScenarioResponse> {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario),
  });
  return handleResponse<ScenarioResponse>(res);
}

export async function getReport(analysisId: string): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/report`);
  return handleResponse<ReportResponse>(res);
}
