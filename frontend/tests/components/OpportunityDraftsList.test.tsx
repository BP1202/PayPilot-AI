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
      />
    );

    expect(screen.getByText("No opportunity drafts yet")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Capture an Opportunity/i });
    fireEvent.click(btn);
    expect(onCreateNew).toHaveBeenCalledTimes(1);
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

