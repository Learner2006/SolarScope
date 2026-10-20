import { describe, it, expect } from "vitest";
import { getProvenanceBadge, getFooterAttribution } from "../utils/provenance";
import { Provenance } from "../types/analysis";

describe("Provenance Utility Functions", () => {
  const astronomicalProv: Provenance = {
    source_type: "solarscope_astronomical_model",
    dataset_name: "SolarScope Clear-Sky & Astronomical Insolation Model",
    retrieval_timestamp: "2026-10-19T18:00:00Z",
    attribution: "SolarScope Theoretical Solar Model (Duffie & Beckman solar geometry, Kasten-Young 1989 air mass).",
    coordinates_used: "28.6139° N, 77.2090° E",
    is_live_retrieval: false,
  };

  const fixtureProv: Provenance = {
    source_type: "local_fixture",
    dataset_name: "SolarScope Offline Synthetic Benchmark Fixture (San Francisco 2019)",
    retrieval_timestamp: "2026-10-19T18:00:00Z",
    attribution: "SolarScope Offline Synthetic Benchmark Fixture (San Francisco 2019 baseline). Deterministic reference dataset.",
    coordinates_used: "37.7749° N, -122.4194° W (San Francisco synthetic benchmark)",
    is_live_retrieval: false,
  };

  const liveProv: Provenance = {
    source_type: "renewables_ninja_api",
    dataset_name: "MERRA2 atmospheric reanalysis (via live Renewables.ninja API)",
    retrieval_timestamp: "2026-10-19T18:00:00Z",
    attribution: "S. Pfenninger and I. Staffell (2016)...",
    coordinates_used: "37.7749° N, -122.4194° W",
    is_live_retrieval: true,
  };

  describe("getProvenanceBadge", () => {
    it("returns Clear-Sky Model badge for astronomical clear-sky runs (e.g. Delhi, London)", () => {
      const badge = getProvenanceBadge(astronomicalProv);
      expect(badge.label).toBe("● Clear-Sky Model");
      expect(badge.className).toBe("badge-blue");
      expect(badge.tooltip).toContain("clear-sky");
    });

    it("returns Benchmark Fixture badge for local fixture runs", () => {
      const badge = getProvenanceBadge(fixtureProv);
      expect(badge.label).toBe("● Benchmark Fixture");
      expect(badge.className).toBe("badge-amber");
      expect(badge.tooltip).toContain("benchmark fixture");
    });

    it("returns Live API Data badge for live API runs", () => {
      const badge = getProvenanceBadge(liveProv);
      expect(badge.label).toBe("● Live API Data");
      expect(badge.className).toBe("badge-emerald");
    });

    it("returns Ready to Analyze badge when no provenance is present", () => {
      const badge = getProvenanceBadge(null);
      expect(badge.label).toBe("Ready to Analyze");
      expect(badge.className).toBe("badge-neutral");
    });
  });

  describe("getFooterAttribution", () => {
    it("attributes clear-sky celestial model and disclaims Renewables.ninja / MERRA-2", () => {
      const attr = getFooterAttribution(astronomicalProv);
      expect(attr.detail).toContain("SolarScope's theoretical celestial geometry");
      expect(attr.detail).toContain("Does not use Renewables.ninja or MERRA-2");
      expect(attr.citation).toBeUndefined();
    });

    it("honestly attributes benchmark fixture as synthetic without claiming verified MERRA-2 or citation", () => {
      const attr = getFooterAttribution(fixtureProv);
      expect(attr.detail).toContain("Offline synthetic benchmark");
      expect(attr.citation).toBeUndefined();
      expect(attr.license).toBeUndefined();
    });

    it("attributes live Renewables.ninja API with citation for live API runs", () => {
      const attr = getFooterAttribution(liveProv);
      expect(attr.detail).toContain("live Renewables.ninja API / MERRA-2");
      expect(attr.citation).toContain("Pfenninger and I. Staffell (2016)");
    });

    it("provides general attribution when no analysis is active", () => {
      const attr = getFooterAttribution(null);
      expect(attr.detail).toContain("SolarScope analytical engine supports both");
    });
  });
});
