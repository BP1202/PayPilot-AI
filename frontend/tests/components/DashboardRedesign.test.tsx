import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OpportunityHeroBanner } from "@/components/dashboard/OpportunityHeroBanner";
import { OpportunityStatsBar } from "@/components/dashboard/OpportunityStatsBar";
import { OpportunityQuickActions } from "@/components/dashboard/OpportunityQuickActions";
import { RecommendedOpportunitiesSection } from "@/components/dashboard/RecommendedOpportunitiesSection";
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
  describe("OpportunityHeroBanner", () => {
    it("renders network title, value points, and triggers quick actions on click", () => {
      const onQuickAction = vi.fn();
      render(<OpportunityHeroBanner onQuickAction={onQuickAction} />);

      expect(screen.getByText(/Idea-to-Business/i)).toBeInTheDocument();
      expect(screen.getByText(/Opportunity Network/i)).toBeInTheDocument();
      expect(screen.getByText("Seek Solutions")).toBeInTheDocument();
      expect(screen.getByText("Share Skills & Ideas")).toBeInTheDocument();

      // Check the 4 value checklist points
      expect(screen.getByText("Find matched partners")).toBeInTheDocument();
      expect(screen.getByText("Collaborate securely")).toBeInTheDocument();
      expect(screen.getByText("Get paid for real work")).toBeInTheDocument();
      expect(screen.getByText("Grow together")).toBeInTheDocument();

      // Click Seek Solutions
      fireEvent.click(screen.getByText("Seek Solutions"));
      expect(onQuickAction).toHaveBeenCalledWith("SEEKING_SOLUTION");

      // Click Share Skills
      fireEvent.click(screen.getByText("Share Skills & Ideas"));
      expect(onQuickAction).toHaveBeenCalledWith("OFFERING_SOLUTION");
    });
  });

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

  describe("RecommendedOpportunitiesSection", () => {
    it("displays honest empty state and category pills", () => {
      const onSelectCategory = vi.fn();
      const onExploreAll = vi.fn();

      render(
        <RecommendedOpportunitiesSection
          onSelectCategory={onSelectCategory}
          onExploreAll={onExploreAll}
        />
      );

      expect(
        screen.getByText(
          "Your personalized matches will appear here as the opportunity network grows."
        )
      ).toBeInTheDocument();

      expect(screen.getByText("Fintech")).toBeInTheDocument();
      expect(screen.getByText("Tech")).toBeInTheDocument();
      expect(screen.getByText("Business")).toBeInTheDocument();
      expect(screen.getByText("Local")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^Fintech$/i }));
      expect(onSelectCategory).toHaveBeenCalledWith("FINTECH");

      fireEvent.click(screen.getByRole("button", { name: /^Tech$/i }));
      expect(onSelectCategory).toHaveBeenCalledWith("TECH");
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

      expect(screen.getByText("PayPilot AI")).toBeInTheDocument();
      expect(screen.getByText("Connect · Collaborate · Grow")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("My Opportunities")).toBeInTheDocument();
      expect(screen.getByText("Commerce Ledger")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /My Opportunities/i }));
      expect(onNavigate).toHaveBeenCalledWith("opportunities");

      fireEvent.click(screen.getByRole("button", { name: /Commerce Ledger/i }));
      expect(onNavigate).toHaveBeenCalledWith("ledger");
    });
  });
});
