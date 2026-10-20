import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MethodologyPage } from "../routes/MethodologyPage";
import { AnalysisProvider } from "../state/AnalysisContext";

describe("MethodologyPage Component — Architectural Accuracy & Traceability", () => {
  const renderMethodology = () =>
    render(
      <AnalysisProvider>
        <MethodologyPage />
      </AnalysisProvider>
    );

  it("renders both simulation pathways in data flow pipeline", () => {
    renderMethodology();

    // Verify Pathway A and Pathway B in architecture pipeline
    expect(screen.getByText(/Pathway A: Historical Reanalysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Pathway B: Astronomical Model/i)).toBeInTheDocument();

    // Verify convergence points
    expect(screen.getByText(/Time-Series Interval & Continuity Validation/i)).toBeInTheDocument();
    expect(screen.getByText(/Generation Scaling & Calendar Aggregation/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Feasibility & Payback Engine/i)).toBeInTheDocument();
  });

  it("distinguishes fixed benchmark fixture from live API and limits academic citation claims", () => {
    renderMethodology();

    // Check fixed fixture description
    expect(
      screen.getByText(/Offline Synthetic Benchmark Fixture \(San Francisco, CA\)/i)
    ).toBeInTheDocument();

    // Check live API token caveat
    expect(
      screen.getByText(/RENEWABLES_NINJA_TOKEN/i)
    ).toBeInTheDocument();

    // Check citations
    expect(screen.getByText(/Pfenninger and I\. Staffell/i)).toBeInTheDocument();
    expect(screen.getByText(/Duffie and W\. A\. Beckman/i)).toBeInTheDocument();
    expect(screen.getByText(/Kasten and A\. T\. Young/i)).toBeInTheDocument();

    // Check scope of academic citations
    expect(
      screen.getByText(/Scope of Academic Citations:/i)
    ).toBeInTheDocument();
  });

  it("documents inclusive dates, UTC timestamps, leap-year calculations, and lifetime assumptions", () => {
    renderMethodology();

    // Inclusive dates and UTC
    expect(screen.getByText(/Start and end dates are evaluated/i)).toBeInTheDocument();
    expect(screen.getByText(/inclusively/i)).toBeInTheDocument();
    expect(screen.getByText(/UTC timestamps/i)).toBeInTheDocument();

    // Leap-year arithmetic
    expect(screen.getByText(/8,760 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/8,784 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/February has 28 days \(672 hours\)/i)).toBeInTheDocument();
    expect(screen.getByText(/February has 29 days \(696 hours\)/i)).toBeInTheDocument();

    // Constant annual generation and undiscounted assumptions
    expect(
      screen.getByText(/Lifetime calculations assume constant annual generation, flat nominal tariffs, 0% panel degradation, and 0% discount rate/i)
    ).toBeInTheDocument();
  });

  it("presents honest engineering limitations including clear-sky vs reanalysis and structural feasibility", () => {
    renderMethodology();

    expect(screen.getByText(/Theoretical Clear-Sky vs Weather Reanalysis:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical & Structural Feasibility vs Economic Feasibility:/i)).toBeInTheDocument();
    expect(screen.getByText(/Fixed Self-Consumption Ratio:/i)).toBeInTheDocument();
    expect(screen.getByText(/Omission of Degradation, Discounting & Inflation:/i)).toBeInTheDocument();
    expect(screen.getByText(/Inverter Replacement & Balance of System:/i)).toBeInTheDocument();
  });
});
