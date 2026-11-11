import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OpportunityStatsBar } from "@/components/dashboard/OpportunityStatsBar";
import { OpportunityQuickActions } from "@/components/dashboard/OpportunityQuickActions";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Opportunity } from "@/types";

const mockOpportunities: Opportunity[] = [
  {
    id: "opp_1",
    user_id: "usr_alice",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "TECH",
    status: "ANALYSED",
    visibility: "PRIVATE",
    title: "Need Full-Stack Developer for AI Platform",
    original_description: "We are seeking a senior engineer to build our web application.",
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
    user_id: "usr_alice",
    submission_type: "IDEA",
    intent: "OFFERING_SOLUTION",
    category: "FINTECH",
    status: "DRAFT",
    visibility: "PRIVATE",
    title: "Automated Reconciliation Engine",
    original_description: "Offering software development and fintech algorithm capabilities.",
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
    id: "opp_3",
    user_id: "usr_alice",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "LOCAL",
    status: "ANALYSED",
    visibility: "PRIVATE",
    title: "Community Solar Power Grid Coordination",
    original_description: "Local neighborhood seeking clean energy partners.",
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

describe("Redesigned Opportunity Dashboard Components", () => {
  describe("OpportunityStatsBar", () => {
    it("computes and displays real two-sided stats without fabricated metrics", () => {
      const onViewAll = vi.fn();
      const onFilterIntent = vi.fn();

      render(
        <OpportunityStatsBar
          opportunities={mockOpportunities}
          loading={false}
          onViewAll={onViewAll}
          onFilterIntent={onFilterIntent}
        />
      );

      // Total opportunities = 3
      expect(screen.getByText("My Opportunities")).toBeInTheDocument();
      expect(screen.getAllByText("3").length).toBe(2);

      // Seeking count = 2
      expect(screen.getByText("Seeking Opportunities")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();

      // Offering count = 1
      expect(screen.getByText("Offering Opportunities")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();

      // Drafts count = 3
      expect(screen.getByText("Drafts")).toBeInTheDocument();
    });
  });

  describe("OpportunityQuickActions", () => {
    it("triggers appropriate two-sided intent callbacks", () => {
      const onSelectAction = vi.fn();
      render(<OpportunityQuickActions onSelectAction={onSelectAction} />);

      expect(screen.getByText("Get Started")).toBeInTheDocument();
      expect(screen.getByText("I need something")).toBeInTheDocument();
      expect(screen.getByText("I can offer something")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Post a Request/i }));
      expect(onSelectAction).toHaveBeenCalledWith("SEEKING_SOLUTION");

      fireEvent.click(screen.getByRole("button", { name: /Create Opportunity/i }));
      expect(onSelectAction).toHaveBeenCalledWith("OFFERING_SOLUTION");
    });
  });

  describe("AppSidebar", () => {
    it("renders navigation items, brand header, and handles navigation", () => {
      const onNavigate = vi.fn();
      render(
        <AppSidebar
          currentView="home"
          onNavigate={onNavigate}
          currentUser={{
            id: "usr_alice",
            email: "alice@demo.com",
            full_name: "Alice Builder",
            is_active: true,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
          }}
          onOpenProfile={vi.fn()}
          onOpenAuth={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      expect(screen.getByText("Opnly")).toBeInTheDocument();
      expect(screen.getByText("Where Ideas Find the Right People")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Opportunities")).toBeInTheDocument();
      expect(screen.getByText("Connections & Proposals")).toBeInTheDocument();
      expect(screen.getByText("Deal Rooms")).toBeInTheDocument();
      expect(screen.getByText("Payments & Ledger")).toBeInTheDocument();
      expect(screen.getByText("Unified Account")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
      expect(screen.queryByText("AI Matchmaking")).not.toBeInTheDocument();
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Opportunities/i }));
      expect(onNavigate).toHaveBeenCalledWith("opportunities");

      fireEvent.click(screen.getByRole("button", { name: /Payments & Ledger/i }));
      expect(onNavigate).toHaveBeenCalledWith("ledger");
    });
  });
});
