import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MatchRationaleCard } from "@/components/matching/MatchRationaleCard";
import { MatchExplanation } from "@/types";

describe("MatchRationaleCard Component", () => {
  const sampleExplanation: MatchExplanation = {
    match_tier: "STRONG_MATCH",
    score: 0.85,
    strong_signals: ["Proficient in React", "Expert in FastAPI"],
    partial_signals: ["Familiarity with FinTech ledger structures"],
    potential_gaps: ["No listed Kubernetes experience"],
    missing_information: ["Availability timeline not declared"],
    explanation_summary:
      "Candidate demonstrates high compatibility with the core stack requirements.",
    mode: "LIVE_AI",
    provenance: "AI_INFERRED",
  };

  it("renders match tier badge, score, and explanation summary", () => {
    render(<MatchRationaleCard explanation={sampleExplanation} />);

    expect(screen.getByTestId("match-tier-badge")).toHaveTextContent("Strong Match");
    expect(screen.getByText("Score: 85/100")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Candidate demonstrates high compatibility with the core stack requirements."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("AI-Enriched Rationale")).toBeInTheDocument();
  });

  it("renders verified signals, gaps, and missing context lists", () => {
    render(<MatchRationaleCard explanation={sampleExplanation} />);

    expect(screen.getByText("Proficient in React")).toBeInTheDocument();
    expect(screen.getByText("Expert in FastAPI")).toBeInTheDocument();
    expect(
      screen.getByText("Familiarity with FinTech ledger structures")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No listed Kubernetes experience")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Availability timeline not declared")
    ).toBeInTheDocument();
  });

  it("handles compact toggle mode correctly", () => {
    render(<MatchRationaleCard explanation={sampleExplanation} compact={true} />);

    // In compact mode, signals are hidden initially
    expect(screen.queryByText("Verified Alignment")).not.toBeInTheDocument();

    // Click to expand
    const toggleBtn = screen.getByText("View Match Signals & Gaps");
    fireEvent.click(toggleBtn);

    // Signals should now be visible
    expect(screen.getByText("Verified Alignment")).toBeInTheDocument();
    expect(screen.getByText("Hide Match Signals")).toBeInTheDocument();
  });

  it("renders deterministic heuristic label when mode is DETERMINISTIC_FALLBACK", () => {
    const fallbackExp: MatchExplanation = {
      ...sampleExplanation,
      match_tier: "MODERATE_MATCH",
      mode: "DETERMINISTIC_FALLBACK",
      provenance: "DETERMINISTIC_CALCULATION",
    };

    render(<MatchRationaleCard explanation={fallbackExp} />);

    expect(screen.getByTestId("match-tier-badge")).toHaveTextContent("Moderate Match");
    expect(screen.getByText("Deterministic Heuristic")).toBeInTheDocument();
  });
});

