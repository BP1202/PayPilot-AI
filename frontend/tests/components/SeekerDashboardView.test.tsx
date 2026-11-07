import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeekerDashboardView } from "@/components/dashboard/SeekerDashboardView";
import * as api from "@/lib/api";
import { Opportunity, DealRoom, Connection, Proposal, User } from "@/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchDealRooms: vi.fn(),
    fetchConnectionRequests: vi.fn(),
    fetchProposals: vi.fn(),
    fetchRecommendedOpportunities: vi.fn(),
  };
});

const mockUser: User = {
  id: "usr_seeker1",
  email: "seeker@opnly.demo",
  full_name: "Sarah Seeker",
  is_active: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const mockOpportunities: Opportunity[] = [
  {
    id: "opp_1",
    user_id: "usr_seeker1",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "TECH",
    status: "DRAFT",
    visibility: "PRIVATE",
    title: "Need Cloud Architect for API Scaling",
    original_description: "Scaling our backend architecture.",
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
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  },
  {
    id: "opp_2",
    user_id: "usr_seeker1",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "FINTECH",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: "Financial Reconciliation System",
    original_description: "Automated payment reconciliation.",
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
    user_id: "usr_seeker1",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "BUSINESS",
    status: "NEGOTIATING",
    visibility: "AUTHENTICATED",
    title: "Supply Chain Logistics Optimization",
    original_description: "Routing optimization for distribution centers.",
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
    id: "room_1",
    proposal_id: "prop_1",
    connection_id: "conn_1",
    title: "Supply Chain Deal Room",
    description: "Active negotiation room",
    status: "ACTIVE",
    accepted_proposal_version: 1,
    created_at: "2026-11-06T00:00:00Z",
    updated_at: "2026-11-06T00:00:00Z",
  },
];

describe("SeekerDashboardView Component", () => {
  const onPostNeed = vi.fn();
  const onBrowseContributors = vi.fn();
  const onViewMyOpportunities = vi.fn();
  const onViewConnections = vi.fn();
  const onOpenDealRooms = vi.fn();
  const onSelectOpportunity = vi.fn();
  const onSwitchWorkspace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDealRooms).mockResolvedValue({ items: mockDealRooms, total: mockDealRooms.length });
    vi.mocked(api.fetchConnectionRequests).mockResolvedValue({ items: [], total: 0, pending_count: 0, accepted_count: 0 });
    vi.mocked(api.fetchProposals).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.fetchRecommendedOpportunities).mockResolvedValue({
      items: [
        {
          opportunity: { id: "opp_cand1", title: "Cloud Expert", category: "TECH" } as any,
          matched_skills: ["AWS", "Docker"],
          score: 85,
          confidence_tier: "STRONG",
          rationale: "Relevant capabilities match your need.",
        },
      ],
      total: 1,
      mode: "DETERMINISTIC_FALLBACK",
    });
  });

  it("renders clear dashboard introduction with Seeker Workspace heading, supporting text, and Post a Need CTA", () => {
    render(
      <SeekerDashboardView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        onPostNeed={onPostNeed}
        onBrowseContributors={onBrowseContributors}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    expect(screen.getByRole("heading", { name: "Seeker Workspace" })).toBeInTheDocument();
    expect(
      screen.getByText(/Describe a business problem or need, discover contributors with relevant capabilities/i)
    ).toBeInTheDocument();

    const postButtons = screen.getAllByRole("button", { name: /Post a Need/i });
    expect(postButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(postButtons[0]);
    expect(onPostNeed).toHaveBeenCalledTimes(1);

    const switchBtn = screen.getByRole("button", { name: /Switch to Contributor/i });
    expect(switchBtn).toBeInTheDocument();
    fireEvent.click(switchBtn);
    expect(onSwitchWorkspace).toHaveBeenCalledTimes(1);
  });

  it("renders all 5 primary actions and triggers their respective callbacks", () => {
    render(
      <SeekerDashboardView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        onPostNeed={onPostNeed}
        onBrowseContributors={onBrowseContributors}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    expect(screen.getByRole("heading", { name: "Primary Actions" })).toBeInTheDocument();

    // 1. Post a Need
    const postNeedCard = screen.getByRole("button", { name: /Start Need/i });
    fireEvent.click(postNeedCard);
    expect(onPostNeed).toHaveBeenCalled();

    // 2. Browse Contributors
    const browseCard = screen.getByRole("button", { name: /Explore Network/i });
    fireEvent.click(browseCard);
    expect(onBrowseContributors).toHaveBeenCalled();

    // 3. My Opportunities
    const myOppsCard = screen.getByRole("button", { name: /View Listings/i });
    fireEvent.click(myOppsCard);
    expect(onViewMyOpportunities).toHaveBeenCalled();

    // 4. Connections
    const connectionsCard = screen.getByRole("button", { name: /Manage Requests/i });
    fireEvent.click(connectionsCard);
    expect(onViewConnections).toHaveBeenCalled();

    // 5. Deal Rooms
    const dealRoomsCard = screen.getByRole("button", { name: /Open Rooms/i });
    fireEvent.click(dealRoomsCard);
    expect(onOpenDealRooms).toHaveBeenCalled();
  });

  it("calculates real opportunity overview counts accurately across lifecycle states", async () => {
    render(
      <SeekerDashboardView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        onPostNeed={onPostNeed}
        onBrowseContributors={onBrowseContributors}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      // 1 Draft need (opp_1 is DRAFT)
      expect(screen.getByText("1 captured draft")).toBeInTheDocument();

      // 2 Published/active needs (opp_2 is PUBLISHED, opp_3 is NEGOTIATING)
      expect(screen.getByText("2 active needs in network")).toBeInTheDocument();

      // 1 Suggested match from mock recommendation
      expect(screen.getByText("1 candidate recommendation")).toBeInTheDocument();

      // 1 Ongoing collaboration from active deal room
      expect(screen.getByText("1 active Deal Room")).toBeInTheDocument();
    });
  });

  it("renders helpful guided empty state when no recent activity exists", async () => {
    vi.mocked(api.fetchDealRooms).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.fetchRecommendedOpportunities).mockResolvedValue({ items: [], total: 0, mode: "DETERMINISTIC_FALLBACK" });

    render(
      <SeekerDashboardView
        currentUser={mockUser}
        opportunities={[]} // No user opportunities
        onPostNeed={onPostNeed}
        onBrowseContributors={onBrowseContributors}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No recent activity yet")).toBeInTheDocument();
      expect(
        screen.getByText(/Post a need or browse available contributors to start your first collaboration/i)
      ).toBeInTheDocument();
      expect(screen.getByText("You haven't posted any needs yet")).toBeInTheDocument();
    });
  });

  it("renders real authorized activity items when records exist", async () => {
    const mockConnections: Connection[] = [
      {
        id: "conn_1",
        status: "PENDING",
        intent: "EXPLORE_COLLABORATION",
        message: "Hi, let's collaborate on your cloud API.",
        requester: { user_id: "usr_alice", full_name: "Alice Developer", skills: ["Go", "AWS"] },
        recipient: { user_id: "usr_seeker1", full_name: "Sarah Seeker", skills: [] },
      },
    ];
    vi.mocked(api.fetchConnectionRequests).mockResolvedValue({
      items: mockConnections,
      total: mockConnections.length,
      pending_count: 1,
      accepted_count: 0,
    });

    render(
      <SeekerDashboardView
        currentUser={mockUser}
        opportunities={mockOpportunities}
        onPostNeed={onPostNeed}
        onBrowseContributors={onBrowseContributors}
        onViewMyOpportunities={onViewMyOpportunities}
        onViewConnections={onViewConnections}
        onOpenDealRooms={onOpenDealRooms}
        onSelectOpportunity={onSelectOpportunity}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Connection Request")).toBeInTheDocument();
      expect(screen.getByText(/Connection with Sarah Seeker is pending/i)).toBeInTheDocument();
    });
  });
});

