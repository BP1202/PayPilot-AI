import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CandidateRecommendationsModal } from "@/components/matching/CandidateRecommendationsModal";
import * as api from "@/lib/api";
import { ParticipantMatchesResponse } from "@/types";

describe("CandidateRecommendationsModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleResponse: ParticipantMatchesResponse = {
    opportunity_id: "opp-123",
    opportunity_title: "Payments Gateway",
    total: 2,
    mode: "DETERMINISTIC_FALLBACK",
    items: [
      {
        participant_type: "INDIVIDUAL",
        id: "cand-1",
        name: "Alice Blockchain Engineer",
        headline: "Senior Smart Contract Engineer",
        industry: "FinTech",
        location: "London, UK",
        skills: ["Solidity", "Rust", "FastAPI"],
        services: ["Auditing", "Smart Contracts"],
        explanation: {
          match_tier: "STRONG_MATCH",
          score: 0.9,
          strong_signals: ["Proficient in FastAPI", "Proficient in Solidity"],
          partial_signals: [],
          missing_information: [],
          potential_gaps: [],
          explanation_summary: "Direct skill match for core stack.",
          mode: "DETERMINISTIC_FALLBACK",
          provenance: "DETERMINISTIC_CALCULATION",
        },
      },
      {
        participant_type: "BUSINESS",
        id: "biz-1",
        name: "Apex FinTech Studio",
        headline: "Turnkey enterprise payment integrations",
        industry: "FinTech",
        location: "New York, USA",
        skills: ["React", "FastAPI", "PostgreSQL"],
        services: ["Full Stack Development"],
        explanation: {
          match_tier: "MODERATE_MATCH",
          score: 0.6,
          strong_signals: ["Proficient in FastAPI"],
          partial_signals: [],
          missing_information: [],
          potential_gaps: [],
          explanation_summary: "Relevant enterprise agency partner.",
          mode: "DETERMINISTIC_FALLBACK",
          provenance: "DETERMINISTIC_CALCULATION",
        },
      },
    ],
  };

  it("does not render when isOpen is false", () => {
    render(
      <CandidateRecommendationsModal
        isOpen={false}
        opportunityId="opp-123"
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId("candidate-recommendations-modal")).not.toBeInTheDocument();
  });

  it("renders candidates and advisory disclaimer banner", async () => {
    vi.spyOn(api, "fetchOpportunityCandidates").mockResolvedValue(sampleResponse);

    render(
      <CandidateRecommendationsModal
        isOpen={true}
        opportunityId="opp-123"
        opportunityTitle="Payments Gateway"
        onClose={vi.fn()}
      />
    );

    // Advisory notice
    expect(screen.getByText(/Advisory Recommendations:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alice Blockchain Engineer")).toBeInTheDocument();
      expect(screen.getByText("Apex FinTech Studio")).toBeInTheDocument();
    });

    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Senior Smart Contract Engineer")).toBeInTheDocument();
  });

  it("renders empty state when no candidates match", async () => {
    vi.spyOn(api, "fetchOpportunityCandidates").mockResolvedValue({
      opportunity_id: "opp-123",
      opportunity_title: "Payments Gateway",
      total: 0,
      mode: "DETERMINISTIC_FALLBACK",
      items: [],
    });

    render(
      <CandidateRecommendationsModal
        isOpen={true}
        opportunityId="opp-123"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No matching candidates identified yet")
      ).toBeInTheDocument();
    });
  });

  it("calls onClose when close button clicked", async () => {
    const handleClose = vi.fn();
    vi.spyOn(api, "fetchOpportunityCandidates").mockResolvedValue(sampleResponse);

    render(
      <CandidateRecommendationsModal
        isOpen={true}
        opportunityId="opp-123"
        onClose={handleClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Blockchain Engineer")).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

