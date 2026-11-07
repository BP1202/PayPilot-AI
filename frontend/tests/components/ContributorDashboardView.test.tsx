import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContributorDashboardView } from "@/components/dashboard/ContributorDashboardView";
import * as api from "@/lib/api";
import { Opportunity, DealRoom, Connection, Proposal, User, OpportunityCandidate } from "@/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchDealRooms: vi.fn(),
    fetchConnectionRequests: vi.fn(),
    fetchProposals: vi.fn(),
    fetchRecommendedOpportunities: vi.fn(),
    fetchPublishedOpportunities: vi.fn(),
  };
});

const mockUser: User = {
  id: "usr_contributor1",
  email: "contributor@opnly.demo",
  full_name: "Devon Contributor",
  is_active: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const mockOffers: Opportunity[] = [
  // Active offer 1
  {
    id: "off_1",
    user_id: "usr_contributor1",
    submission_type: "IDEA",
    intent: "OFFERING_SOLUTION",
    category: "TECH",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: "Senior Cloud & Distributed Systems Architecture",
    original_description: "Offering AWS and Kubernetes architecture services.",
    target_customer_segments: [],
    customer_pain_points: [],
    required_skills_and_resources: ["AWS", "Kubernetes", "Go"],
    potential_business_models: [],
    key_assumptions: [],
    risks_and_uncertainties: [],
    missing_information: [],
    suggested_follow_up_questions: [],
    provenance: {},
    ai_metadata: {},
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  },
  // Active offer 2
  {
    id: "off_2",
    user_id: "usr_contributor1",
    submission_type: "IDEA",
    intent: "OFFERING_SOLUTION",
    category: "FINTECH",
    status: "MATCHING",
    visibility: "AUTHENTICATED",
    title: "Payment Gateway Integration & Ledger Verification",
    original_description: "Stripe and PayPal compliant transaction integration.",
    target_customer_segments: [],
    customer_pain_points: [],
    required_skills_and_resources: ["Fintech", "Security"],
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
  // Draft offer (not active)
  {
    id: "off_draft",
    user_id: "usr_contributor1",
    submission_type: "IDEA",
    intent: "OFFERING_SOLUTION",
    category: "BUSINESS",
    status: "DRAFT",
    visibility: "PUBLIC",
    title: "Draft Consulting Package",
    original_description: "Draft work.",
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

const mockDealRooms: DealRoom[] = [
  {
    id: "room_contributor1",
    proposal_id: "prop_1",
    connection_id: "conn_1",
    title: "Fintech Settlement Deal Room",
    description: "Active collaboration room",
    status: "ACTIVE",
    accepted_proposal_version: 1,
    created_at: "2026-11-06T00:00:00Z",
    updated_at: "2026-11-06T00:00:00Z",
  },
];

const mockProposals: Proposal[] = [
  {
    id: "prop_1",
    connection_id: "conn_1",
    title: "High-Throughput Reconciliation Architecture",
    description: "Phase 1 pipeline delivery",
    status: "SUBMITTED",
    current_version: 1,
    deliverables: ["Architecture Spec"],
    budget_amount: "15000.00",
    currency: "USD",
    proposer: { user_id: "usr_contributor1", full_name: "Devon Contributor", skills: ["Go"] },
    recipient: { user_id: "usr_client1", full_name: "Acme Corp", skills: [] },
  },
  {
    id: "prop_2",
    connection_id: "conn_2",
    title: "Compliance Audit Proposal",
    description: "Audit work",
    status: "REVISION_REQUESTED",
    current_version: 2,
    deliverables: ["Audit Plan"],
    budget_amount: "5000.00",
    currency: "USD",
    proposer: { user_id: "usr_contributor1", full_name: "Devon Contributor", skills: [] },
    recipient: { user_id: "usr_client2", full_name: "FinSecure", skills: [] },
  },
];

const mockCandidates: OpportunityCandidate[] = [
  {
    id: "need_candidate1",
    title: "Need Enterprise Ledger Optimization",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "FINTECH",
    industry: "Banking",
    required_skills_and_resources: ["Fintech", "Go", "PostgreSQL"],
    value_proposition: "Scale our financial ledger throughput to 10k transactions/sec.",
    explanation: {
      match_tier: "STRONG",
      score: 92,
      strong_signals: ["Fintech", "Go"],
      partial_signals: [],
      missing_information: [],
      potential_gaps: [],
      explanation_summary: "Your verified expertise in payment reconciliation directly matches this banking problem.",
      mode: "LIVE_AI",
      provenance: "AI_INFERRED",
    },
  },
];

describe("ContributorDashboardView Component", () => {
  const onBrowseOpportunities = vi.fn();
  const onOfferSkills = vi.fn();
  const onCompleteProfile = vi.fn();
  const onManageMyOffers = vi.fn();
  const onViewSuggestedMatches = vi.fn();
  const onViewConnections = vi.fn();
  const onOpenDealRooms = vi.fn();
  const onSelectOpportunity = vi.fn();
  const onSwitchWorkspace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDealRooms).mockResolvedValue({ items: mockDealRooms, total: mockDealRooms.length });
    vi.mocked(api.fetchConnectionRequests).mockResolvedValue({ items: [], total: 0, pending_count: 0, accepted_count: 0 });
    vi.mocked(api.fetchProposals).mockResolvedValue({ items: mockProposals, total: mockProposals.length });
    vi.mocked(api.fetchRecommendedOpportunities).mockResolvedValue({
      items: mockCandidates,
      total: 1,
      mode: "LIVE_AI",
    });
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
  });

  it("renders clear dashboard introduction with Contributor Workspace heading, supporting text, and Browse Opportunities CTA", () => {
    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mockOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    expect(screen.getByRole("heading", { name: "Contributor Workspace" })).toBeInTheDocument();
    expect(
      screen.getByText(/Offer your capabilities, discover business needs where you can contribute/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Browse Opportunities/i })[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Offer Your Skills/i })).toBeInTheDocument();
    expect(screen.getByText(/Switch to Seeker Workspace/i)).toBeInTheDocument();
  });

  it("renders all 5 primary actions and triggers their respective callbacks", () => {
    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mockOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    // Primary action 1: Browse Opportunities
    const browseAction = screen.getByRole("button", { name: /Explore Needs/i });
    fireEvent.click(browseAction);
    expect(onBrowseOpportunities).toHaveBeenCalledTimes(1);

    // Primary action 2: Suggested Matches
    const matchesAction = screen.getByRole("button", { name: /View Recommendations/i });
    fireEvent.click(matchesAction);
    expect(onViewSuggestedMatches).toHaveBeenCalledTimes(1);

    // Primary action 3: Manage My Offers
    const offersAction = screen.getByRole("button", { name: /View My Offers/i });
    fireEvent.click(offersAction);
    expect(onManageMyOffers).toHaveBeenCalledTimes(1);

    // Primary action 4: Connections & Proposals
    const proposalsAction = screen.getByRole("button", { name: /View Proposals/i });
    fireEvent.click(proposalsAction);
    expect(onViewConnections).toHaveBeenCalledTimes(1);

    // Primary action 5: Deal Rooms
    const dealRoomsAction = screen.getByRole("button", { name: /Open Rooms/i });
    fireEvent.click(dealRoomsAction);
    expect(onOpenDealRooms).toHaveBeenCalledTimes(1);
  });

  it("calculates real activity overview counts accurately across authoritative lifecycle states and dual discovery criteria", async () => {
    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mockOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      // 2 Active Offers (off_1 is PUBLISHED/PUBLIC, off_2 is MATCHING/AUTHENTICATED; off_draft is DRAFT so excluded)
      expect(screen.getByText("2 active capability offers")).toBeInTheDocument();

      // 1 Suggested Opportunity from mock recommendations
      expect(screen.getByText("1 matching business need")).toBeInTheDocument();

      // 2 Pending Proposals (prop_1 is SUBMITTED, prop_2 is REVISION_REQUESTED)
      expect(screen.getByText("2 pending (1 revision needed)")).toBeInTheDocument();

      // 1 Ongoing Collaboration from active deal room
      expect(screen.getByText("1 active Deal Room")).toBeInTheDocument();
    });
  });

  it("strictly excludes completed, archived, closed, shared, private, and draft records from Active Offers count", async () => {
    const mixedOffers: Opportunity[] = [
      // Active in network
      {
        ...mockOffers[0],
        id: "off_pub_active",
        intent: "OFFERING_SOLUTION",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      // Excluded: completed, archived, closed
      {
        ...mockOffers[0],
        id: "off_completed",
        intent: "OFFERING_SOLUTION",
        status: "COMPLETED",
        visibility: "PUBLIC",
      },
      {
        ...mockOffers[0],
        id: "off_archived",
        intent: "OFFERING_SOLUTION",
        status: "ARCHIVED",
        visibility: "PUBLIC",
      },
      {
        ...mockOffers[0],
        id: "off_closed",
        intent: "OFFERING_SOLUTION",
        status: "CLOSED",
        visibility: "PUBLIC",
      },
      // Excluded: shared visibility (scoped to specific entities, not general network discoverability)
      {
        ...mockOffers[0],
        id: "off_shared",
        intent: "OFFERING_SOLUTION",
        status: "PUBLISHED",
        visibility: "SHARED",
      },
      // Excluded: private visibility
      {
        ...mockOffers[0],
        id: "off_private",
        intent: "OFFERING_SOLUTION",
        status: "PUBLISHED",
        visibility: "PRIVATE",
      },
      // Excluded: intent is SEEKING_SOLUTION (seeker problem, not contributor offer)
      {
        ...mockOffers[0],
        id: "need_not_offer",
        intent: "SEEKING_SOLUTION",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    ];

    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mixedOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      // Exactly 1 active capability offer
      expect(screen.getByText("1 active capability offer")).toBeInTheDocument();
    });
  });

  it("renders suggested business needs with genuine evidence-based explanation rationale", async () => {
    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mockOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Need Enterprise Ledger Optimization")).toBeInTheDocument();
      expect(screen.getByText(/Scale our financial ledger throughput/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Your verified expertise in payment reconciliation directly matches this banking problem/i)
      ).toBeInTheDocument();
    });
  });

  it("does not silently fall back to discovery when recommendations fail and shows honest error state with Unavailable metrics", async () => {
    vi.mocked(api.fetchRecommendedOpportunities).mockRejectedValue(new Error("Matchmaker offline"));
    vi.mocked(api.fetchDealRooms).mockRejectedValue(new Error("Deal room service offline"));

    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mockOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      // Shows error banner with retry
      expect(
        screen.getByText(/We could not refresh some collaboration records/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();

      // Displays Unavailable instead of misleading 0
      const unavailableBadges = screen.getAllByText("Unavailable");
      expect(unavailableBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("does not leak confidential proposal budgets or private documents into activity feed", async () => {
    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={mockOffers}
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Proposal Update")[0]).toBeInTheDocument();
      expect(
        screen.getByText(/Proposal "High-Throughput Reconciliation Architecture" is submitted/i)
      ).toBeInTheDocument();

      // Confidential financial amount ($15,000.00) MUST NOT be leaked into the feed
      expect(screen.queryByText(/15000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/5000/)).not.toBeInTheDocument();
    });
  });

  it("renders helpful guided empty states when user has no offers, no deal rooms, and no recent activity", async () => {
    vi.mocked(api.fetchDealRooms).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.fetchProposals).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.fetchConnectionRequests).mockResolvedValue({ items: [], total: 0, pending_count: 0, accepted_count: 0 });
    vi.mocked(api.fetchRecommendedOpportunities).mockResolvedValue({ items: [], total: 0, mode: "DETERMINISTIC_FALLBACK" });

    render(
      <ContributorDashboardView
        currentUser={mockUser}
        opportunities={[]} // No user offers
        onBrowseOpportunities={onBrowseOpportunities}
        onOfferSkills={onOfferSkills}
        onCompleteProfile={onCompleteProfile}
        onManageMyOffers={onManageMyOffers}
        onViewSuggestedMatches={onViewSuggestedMatches}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      // Empty offers state
      expect(screen.getByText("You haven't posted any capability offers yet")).toBeInTheDocument();

      // Empty activity state
      expect(screen.getByText("No recent activity yet")).toBeInTheDocument();

      // Empty suggestions state
      expect(screen.getByText("No suggestions yet")).toBeInTheDocument();
    });
  });
});
