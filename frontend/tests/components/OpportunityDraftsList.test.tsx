import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OpportunityDraftsList } from "@/components/OpportunityDraftsList";
import { Opportunity } from "@/types";

const mockOpportunities: Opportunity[] = [
  {
    id: "opp_1",
    user_id: "owner_default",
    submission_type: "IDEA",
    status: "ANALYSED",
    visibility: "PRIVATE",
    title: "FreightPilot Pro",
    original_description: "Real-time freight cargo monitoring",
    proposed_solution: "IoT sensors with dispatcher platform",
    industry: "Logistics & Freight",
    target_customer_segments: [],
    customer_pain_points: [],
    required_skills_and_resources: [],
    potential_business_models: [],
    key_assumptions: [],
    risks_and_uncertainties: [],
    missing_information: [],
    suggested_follow_up_questions: [],
    provenance: {},
    ai_metadata: {},
    created_at: "2026-11-04T00:00:00Z",
    updated_at: "2026-11-04T00:00:00Z",
  },
  {
    id: "opp_2",
    user_id: "owner_default",
    submission_type: "PROBLEM",
    status: "DRAFT",
    visibility: "PRIVATE",
    title: "Medical Billing Bottleneck",
    original_description: "Doctors spend 15 hours reconciling billing codes",
    problem_statement: "High manual reconciliation overhead",
    industry: "Healthcare & MedTech",
    target_customer_segments: [],
    customer_pain_points: [],
    required_skills_and_resources: [],
    potential_business_models: [],
    key_assumptions: [],
    risks_and_uncertainties: [],
    missing_information: [],
    suggested_follow_up_questions: [],
    provenance: {},
    ai_metadata: {},
    created_at: "2026-11-04T00:00:00Z",
    updated_at: "2026-11-04T00:00:00Z",
  },
];

describe("OpportunityDraftsList Component", () => {
  it("renders empty state when opportunities array is empty", () => {
    const onCreateNew = vi.fn();
    render(
      <OpportunityDraftsList
        opportunities={[]}
        isLoading={false}
        onSelectOpportunity={vi.fn()}
        onCreateNew={onCreateNew}
        onFilterChange={vi.fn()}
        isAuthenticated={true}
      />
    );

    expect(screen.getByText("No opportunity drafts yet")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Capture an Opportunity/i });
    fireEvent.click(btn);
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("renders unauthenticated prompt when user is not signed in", () => {
    const onSignIn = vi.fn();
    const onCreateNew = vi.fn();
    render(
      <OpportunityDraftsList
        opportunities={[]}
        isLoading={false}
        onSelectOpportunity={vi.fn()}
        onCreateNew={onCreateNew}
        onFilterChange={vi.fn()}
        isAuthenticated={false}
        onSignIn={onSignIn}
      />
    );

    expect(
      screen.getByText("Sign in to view your opportunity drafts")
    ).toBeInTheDocument();
    const signInBtn = screen.getByRole("button", { name: /Sign In \/ Register/i });
    fireEvent.click(signInBtn);
    expect(onSignIn).toHaveBeenCalledTimes(1);

    const captureBtn = screen.getByRole("button", { name: /Capture an Opportunity/i });
    fireEvent.click(captureBtn);
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("renders error state and handles retry button click", () => {
    const onRetry = vi.fn();
    render(
      <OpportunityDraftsList
        opportunities={[]}
        isLoading={false}
        error="We couldn't load your opportunity drafts right now."
        onRetry={onRetry}
        onSelectOpportunity={vi.fn()}
        onCreateNew={vi.fn()}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText("Unable to load opportunities")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't load your opportunity drafts right now.")
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Try again/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders loading skeleton state when isLoading is true", () => {
    const { container } = render(
      <OpportunityDraftsList
        opportunities={[]}
        isLoading={true}
        onSelectOpportunity={vi.fn()}
        onCreateNew={vi.fn()}
        onFilterChange={vi.fn()}
      />
    );

    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("renders opportunities list and handles card clicks", () => {
    const onSelect = vi.fn();
    render(
      <OpportunityDraftsList
        opportunities={mockOpportunities}
        isLoading={false}
        onSelectOpportunity={onSelect}
        onCreateNew={vi.fn()}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText("FreightPilot Pro")).toBeInTheDocument();
    expect(screen.getByText("Medical Billing Bottleneck")).toBeInTheDocument();
    expect(screen.getByText("IDEA")).toBeInTheDocument();
    expect(screen.getByText("PROBLEM")).toBeInTheDocument();

    fireEvent.click(screen.getByText("FreightPilot Pro"));
    expect(onSelect).toHaveBeenCalledWith(mockOpportunities[0]);
  });
});
