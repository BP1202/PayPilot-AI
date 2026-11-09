import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnifiedWorkspaceView } from "@/components/dashboard/UnifiedWorkspaceView";
import * as api from "@/lib/api";
import { Opportunity, User, DashboardOverview } from "@/types";

vi.mock("@/lib/api", () => ({
  fetchDealRooms: vi.fn(),
  fetchDealRoomMilestones: vi.fn(),
  fetchConnectionRequests: vi.fn(),
  fetchProposals: vi.fn(),
  fetchOpportunityCandidates: vi.fn(),
  fetchRecommendedOpportunities: vi.fn(),
  fetchMyIndividualProfile: vi.fn(),
}));

const mockUser: User = {
  id: "usr_alex",
  email: "alex@unified.com",
  full_name: "Alex River",
  is_active: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const mockOverview: DashboardOverview = {
  business: {
    id: 1,
    name: "Alex Innovations",
    currency: "USD",
  } as any,
  totals: {
    business_id: 1,
    currency: "USD",
    total_revenue: "3200.00",
    transaction_count: 5,
    completed_count: 4,
    pending_count: 1,
    pending_total: "1800.00",
  },
};

const mockOpportunities: Opportunity[] = [
  {
    id: "opp_1",
    user_id: "usr_alex",
    submission_type: "IDEA",
    title: "AI Logistics Route Optimizer",
    original_description: "Seeking algorithms to optimize multi-stop delivery fleet schedules in real time.",
    intent: "SEEKING_SOLUTION",
    status: "PUBLISHED",
    category: "TECH",
    visibility: "PUBLIC",
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
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-04T00:00:00Z",
  },
  {
    id: "opp_2",
    user_id: "usr_alex",
    submission_type: "IDEA",
    title: "Senior Full-Stack & Smart Contract Consulting",
    original_description: "Offering architecture design, Next.js frontend, and secure API integrations.",
    intent: "OFFERING_SOLUTION",
    status: "PUBLISHED",
    category: "TECH",
    visibility: "PUBLIC",
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
    created_at: "2026-11-02T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
  },
  {
    id: "opp_3",
    user_id: "usr_alex",
    submission_type: "PROBLEM",
    title: "Draft Healthcare Billing Bot",
    original_description: "Early notes on medical billing code automation.",
    intent: "SEEKING_SOLUTION",
    status: "DRAFT",
    category: "BUSINESS",
    visibility: "PRIVATE",
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
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
  },
];

describe("UnifiedWorkspaceView Component", () => {
  const onPostNeed = vi.fn();
  const onOfferCapability = vi.fn();
  const onBrowseOpportunities = vi.fn();
  const onViewMyOpportunities = vi.fn();
  const onViewConnections = vi.fn();
  const onOpenDealRooms = vi.fn();
  const onSelectOpportunity = vi.fn();
  const onViewMatches = vi.fn();
  const onViewLedger = vi.fn();
  const onCompleteProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchDealRooms as any).mockResolvedValue({ items: [], total: 0 });
    (api.fetchDealRoomMilestones as any).mockResolvedValue({ items: [], total: 0 });
    (api.fetchConnectionRequests as any).mockResolvedValue({ items: [], total: 0 });
    (api.fetchProposals as any).mockResolvedValue({ items: [], total: 0 });
    (api.fetchOpportunityCandidates as any).mockResolvedValue({ items: [], total: 0 });
    (api.fetchRecommendedOpportunities as any).mockResolvedValue({ items: [], total: 0 });
    (api.fetchMyIndividualProfile as any).mockResolvedValue({ completeness_percent: 75 });
  });

  it("renders unified header with user greeting and dual participation paths", async () => {
    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onViewMatches={onViewMatches}
        onViewLedger={onViewLedger}
        onCompleteProfile={onCompleteProfile}
      />
    );

    expect(screen.getByText(/Welcome back, Alex River/i)).toBeInTheDocument();
    expect(screen.getByText("Unified Opportunity Network")).toBeInTheDocument();
    expect(screen.getByText("I Need a Solution")).toBeInTheDocument();
    expect(screen.getByText("I Have Capabilities to Offer")).toBeInTheDocument();
  });

  it("triggers post need and list capability callbacks when clicking dual path buttons", async () => {
    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    const postNeedBtns = screen.getAllByRole("button", { name: /Post a (Business )?Need/i });
    fireEvent.click(postNeedBtns[0]);
    expect(onPostNeed).toHaveBeenCalledTimes(1);

    const listCapBtns = screen.getAllByRole("button", { name: /List (a )?Capabilit(y|ies)/i });
    fireEvent.click(listCapBtns[0]);
    expect(onOfferCapability).toHaveBeenCalledTimes(1);
  });

  it("filters listings correctly using intent filter pills", async () => {
    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    // All listings (3 items)
    expect(screen.getByText("AI Logistics Route Optimizer")).toBeInTheDocument();
    expect(screen.getByText("Senior Full-Stack & Smart Contract Consulting")).toBeInTheDocument();
    expect(screen.getByText("Draft Healthcare Billing Bot")).toBeInTheDocument();

    // Filter to Needs Seeking
    fireEvent.click(screen.getByRole("button", { name: /Needs Seeking/i }));
    expect(screen.getByText("AI Logistics Route Optimizer")).toBeInTheDocument();
    expect(screen.getByText("Draft Healthcare Billing Bot")).toBeInTheDocument();
    expect(screen.queryByText("Senior Full-Stack & Smart Contract Consulting")).not.toBeInTheDocument();

    // Filter to Capabilities Offered
    fireEvent.click(screen.getByRole("button", { name: /Capabilities Offered/i }));
    expect(screen.getByText("Senior Full-Stack & Smart Contract Consulting")).toBeInTheDocument();
    expect(screen.queryByText("AI Logistics Route Optimizer")).not.toBeInTheDocument();

    // Filter to Drafts
    fireEvent.click(screen.getByRole("button", { name: /Drafts/i }));
    expect(screen.getByText("Draft Healthcare Billing Bot")).toBeInTheDocument();
    expect(screen.queryByText("AI Logistics Route Optimizer")).not.toBeInTheDocument();
  });

  it("renders verified actionable alerts for incoming items and ignores outgoing items", async () => {
    // 1 incoming proposal for current user (actionable)
    // 1 outgoing submitted proposal by current user (non-actionable, waiting on recipient)
    (api.fetchProposals as any).mockResolvedValue({
      items: [
        {
          id: 101,
          status: "SUBMITTED",
          title: "Incoming Routing Algorithm Proposal",
          recipient: { user_id: "usr_alex" },
          proposer: { user_id: "usr_bob" },
        },
        {
          id: 102,
          status: "SUBMITTED",
          title: "Outgoing Full-Stack Bid",
          recipient: { user_id: "usr_charlie" },
          proposer: { user_id: "usr_alex" },
        },
      ],
      total: 2,
    });

    // 1 incoming connection request (actionable)
    // 1 outgoing connection request (non-actionable)
    (api.fetchConnectionRequests as any).mockResolvedValue({
      items: [
        {
          id: 201,
          status: "PENDING",
          message: "Would love to partner on logistics",
          recipient: { user_id: "usr_alex" },
          requester: { user_id: "usr_dan" },
        },
        {
          id: 202,
          status: "PENDING",
          message: "Sent request to enterprise buyer",
          recipient: { user_id: "usr_eve" },
          requester: { user_id: "usr_alex" },
        },
      ],
      total: 2,
    });

    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Action Items Awaiting Your Attention/i)).toBeInTheDocument();
      expect(screen.getByText("Incoming Proposal to Review")).toBeInTheDocument();
      expect(screen.getByText("Incoming Routing Algorithm Proposal")).toBeInTheDocument();
      expect(screen.getByText(/Connection Request from/i)).toBeInTheDocument();
      expect(screen.queryByText("Outgoing Full-Stack Bid")).not.toBeInTheDocument();
      expect(screen.queryByText("Sent request to enterprise buyer")).not.toBeInTheDocument();
    });
  });

  it("renders both matchmaking directions: candidates for needs and recommended opportunities for skills", async () => {
    (api.fetchOpportunityCandidates as any).mockResolvedValue({
      items: [
        {
          id: "usr_dana",
          name: "Dana Algorithmics",
          participant_type: "INDIVIDUAL",
          headline: "Combinatorial Optimization Lead",
          skills: ["Routing", "Algorithms"],
          services: ["Consulting"],
          explanation: {
            score: 94,
            match_tier: "STRONG_MATCH",
            explanation_summary: "Deep expertise in vehicle routing optimization.",
          },
        },
      ],
      total: 1,
    });

    (api.fetchRecommendedOpportunities as any).mockResolvedValue({
      items: [
        {
          id: "opp_ext_99",
          title: "Multi-Cloud FinOps Platform",
          intent: "SEEKING_SOLUTION",
          category: "TECH",
          submission_type: "IDEA",
          required_skills_and_resources: ["Cloud", "Cost Optimization"],
          explanation: {
            score: 89,
            match_tier: "STRONG_MATCH",
            explanation_summary: "Requires high-performance backend architecture.",
          },
        },
      ],
      total: 1,
    });

    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    // Initial tab is "Partners for Your Needs"
    await waitFor(() => {
      expect(screen.getByText("Dana Algorithmics")).toBeInTheDocument();
      expect(screen.getByText("Deep expertise in vehicle routing optimization.")).toBeInTheDocument();
    });

    // Switch to "Opportunities for Your Skills" tab
    fireEvent.click(screen.getByRole("button", { name: /Opportunities for Your Skills/i }));

    await waitFor(() => {
      expect(screen.getByText("Multi-Cloud FinOps Platform")).toBeInTheDocument();
      expect(screen.getByText("Requires high-performance backend architecture.")).toBeInTheDocument();
    });
  });

  it("calculates real Deal Room milestone progress and handles uninitialized milestone rooms", async () => {
    (api.fetchDealRooms as any).mockResolvedValue({
      items: [
        {
          id: "dr_active_1",
          title: "Fleet Route Optimizer MVP",
          status: "ACTIVE",
          updated_at: "2026-11-06T00:00:00Z",
        },
        {
          id: "dr_empty_2",
          title: "Contract Review & Scoping",
          status: "ACTIVE",
          updated_at: "2026-11-07T00:00:00Z",
        },
      ],
      total: 2,
    });

    (api.fetchDealRoomMilestones as any).mockImplementation(async (roomId: string) => {
      if (roomId === "dr_active_1") {
        return {
          items: [
            { id: "m_1", title: "Architecture Spec", status: "APPROVED", amount: "1000" },
            { id: "m_2", title: "API Development", status: "SUBMITTED_FOR_REVIEW", amount: "1500" },
          ],
          total: 2,
        };
      }
      return { items: [], total: 0 };
    });

    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Deal Room #dr_active_1 · Fleet Route Optimizer MVP")).toBeInTheDocument();
      // dr_active_1 has 1 approved out of 2 total = 50%
      expect(screen.getByText("1 of 2 milestones approved")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();

      expect(screen.getByText("Deal Room #dr_empty_2 · Contract Review & Scoping")).toBeInTheDocument();
      // dr_empty_2 has 0 milestones = Pending milestone initialization
      expect(screen.getByText("Pending milestone initialization")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  it("displays factual trust metrics without claiming unverified credentials", async () => {
    (api.fetchMyIndividualProfile as any).mockResolvedValue({
      completeness_percent: 85,
    });
    (api.fetchDealRooms as any).mockResolvedValue({
      items: [
        { id: "dr_comp", title: "Finished Deal", status: "COMPLETED" },
        { id: "dr_act", title: "Ongoing Deal", status: "ACTIVE" },
      ],
      total: 2,
    });
    (api.fetchDealRoomMilestones as any).mockResolvedValue({
      items: [
        { id: "m_done", status: "APPROVED" },
      ],
      total: 1,
    });

    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onCompleteProfile={onCompleteProfile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Trust & Activity Record")).toBeInTheDocument();
      expect(screen.getByText("85%")).toBeInTheDocument();
      expect(screen.getByText("Profile Completeness")).toBeInTheDocument();
      expect(screen.getByText("Commercial Settlement Overview")).toBeInTheDocument();
      expect(screen.getByText("USD 3200.00")).toBeInTheDocument();
      expect(screen.getByText("USD 1800.00")).toBeInTheDocument();
      expect(screen.getByText(/PayPal Developer Sandbox/i)).toBeInTheDocument();
    });
  });

  it("renders section-independent error and retry states without breaking the dashboard", async () => {
    // Deal rooms fails
    (api.fetchDealRooms as any).mockRejectedValue(new Error("Database connection timeout"));
    // Matchmaking fails
    (api.fetchOpportunityCandidates as any).mockRejectedValue(new Error("Recommendation engine down"));

    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    await waitFor(() => {
      // Header and opportunities hub still render perfectly
      expect(screen.getByText(/Welcome back, Alex River/i)).toBeInTheDocument();
      expect(screen.getByText("AI Logistics Route Optimizer")).toBeInTheDocument();
      // Deal rooms shows its own retry button
      expect(screen.getByText(/Unable to load Deal Rooms/i)).toBeInTheDocument();
      // Matchmaking shows its own retry button
      expect(screen.getByText(/Unable to load partner recommendations/i)).toBeInTheDocument();
    });
  });

  it("handles opportunity selection to open in studio", async () => {
    render(
      <UnifiedWorkspaceView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        overview={mockOverview}
        onPostNeed={onPostNeed}
        onOfferCapability={onOfferCapability}
        onBrowseOpportunities={onBrowseOpportunities}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
      />
    );

    fireEvent.click(screen.getByText("AI Logistics Route Optimizer"));
    expect(onSelectOpportunity).toHaveBeenCalledWith(mockOpportunities[0]);
  });
});
