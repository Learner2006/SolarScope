/**
 * Provenance badge and attribution utilities.
 *
 * Architectural Decision / Single Source of Truth:
 * Provenance badges, colors, tooltips, and citations are centralized here so Header,
 * Dashboard, Footer, and Report never drift in labeling or legal attribution.
 * The frontend guarantees all badge presentation is resolved directly from backend
 * provenance fields (source_type, is_live_retrieval) rather than hardcoded location heuristics.
 */

import { Provenance } from "../types/analysis";

export interface ProvenanceBadgeInfo {
  label: string;
  className: string;
  tooltip: string;
}

export function getProvenanceBadge(provenance?: Provenance | null): ProvenanceBadgeInfo {
  if (!provenance) {
    return {
      label: "Ready to Analyze",
      className: "badge-neutral",
      tooltip: "No active analysis loaded",
    };
  }

  if (provenance.is_live_retrieval) {
    return {
      label: "● Live API Data",
      className: "badge-emerald",
      tooltip: "Live hourly power simulation retrieved from Renewables.ninja API",
    };
  }

  if (provenance.source_type === "solarscope_astronomical_model") {
    return {
      label: "● Clear-Sky Model",
      className: "badge-blue",
      tooltip: "Theoretical clear-sky celestial model (Duffie & Beckman solar geometry, Kasten-Young air mass)",
    };
  }

  // local_fixture or default fallback
  return {
    label: "● Benchmark Fixture",
    className: "badge-amber",
    tooltip: "Offline synthetic benchmark fixture for San Francisco (2019 baseline)",
  };
}

export interface FooterAttributionInfo {
  lead: string;
  detail: string;
  citation?: string;
  license?: string;
}

export function getFooterAttribution(provenance?: Provenance | null): FooterAttributionInfo {
  if (!provenance) {
    return {
      lead: "Methodology & Attribution:",
      detail:
        "SolarScope analytical engine supports both Renewables.ninja / MERRA-2 historical reanalysis and theoretical clear-sky astronomical modeling.",
    };
  }

  if (provenance.source_type === "solarscope_astronomical_model") {
    return {
      lead: "Methodology & Attribution:",
      detail:
        "Solar simulation calculated using SolarScope's theoretical celestial geometry and clear-sky air mass equations (Duffie & Beckman, Kasten-Young 1989). Does not use Renewables.ninja or MERRA-2 historical weather data.",
    };
  }

  if (provenance.is_live_retrieval) {
    return {
      lead: "Methodology & Attribution:",
      detail: "Solar simulation data powered by live Renewables.ninja API / MERRA-2.",
      citation: "S. Pfenninger and I. Staffell (2016), Energy 114, 1251–1265.",
      license: "CC BY-NC 4.0 license.",
    };
  }

  // local_fixture or default
  return {
    lead: "Methodology & Attribution:",
    detail: "Offline synthetic benchmark simulation (San Francisco 2019 baseline fixture for offline development and testing).",
  };
}
