import {
  AnalysisResponse,
  AnalysisSummary,
  ReportResponse,
  ScenarioRequest,
  ScenarioResponse,
  ScopeInput,
} from "../types/analysis";

/**
 * Resolves the backend API base endpoint.
 *
 * In local development and single-origin deployments (Nginx / Caddy reverse proxy),
 * this falls back to "/api" which uses relative URLs or the Vite dev proxy.
 *
 * In decoupled production deployments (e.g., static CDN frontend communicating with
 * a standalone API service), the VITE_API_BASE_URL build environment variable can be set
 * (e.g., "https://solarscope-api.onrender.com" or "https://api.yourdomain.com").
 */
export function resolveApiBase(envBaseUrl?: string): string {
  const raw = (envBaseUrl !== undefined ? envBaseUrl : (import.meta.env.VITE_API_BASE_URL || "")).trim().replace(/\/+$/, "");
  if (!raw) {
    return "/api";
  }
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

export const API_BASE = resolveApiBase();

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
