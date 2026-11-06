import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DealRoomsListView } from "@/components/deal-rooms/DealRoomsListView";
import { DealRoomWorkspaceView } from "@/components/deal-rooms/DealRoomWorkspaceView";
import { ProposalDetailModal } from "@/components/proposals/ProposalDetailModal";
import { DealRoom, DealRoomOverview, Proposal, User } from "@/types";

// Mock API client functions
vi.mock("@/lib/api", () => ({
  fetchDealRooms: vi.fn(),
  fetchDealRoomById: vi.fn(),
  fetchDealRoomOverview: vi.fn(),
  updateDealRoomStatus: vi.fn(),
  fetchDealRoomNotes: vi.fn().mockResolvedValue([]),
  createDealRoomNote: vi.fn(),
  fetchDealRoomClarifications: vi.fn().mockResolvedValue([]),
  createDealRoomClarification: vi.fn(),
  answerDealRoomClarification: vi.fn(),
  fetchDealRoomDocuments: vi.fn().mockResolvedValue([]),
  createDealRoomDocument: vi.fn(),
  deleteDealRoomDocument: vi.fn(),
  fetchDealRoomActivities: vi.fn().mockResolvedValue([]),
  analyzeDealRoomAI: vi.fn(),
  createDealRoom: vi.fn(),
  respondToProposal: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-token"),
}));

import * as api from "@/lib/api";

describe("Deal Rooms Frontend Module", () => {
  const mockUser: User = {
    id: "usr_alice",
    email: "alice@example.com",
    full_name: "Alice Architect",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const sampleRoom: DealRoom = {
    id: "room_123456",
    proposal_id: "prop_999",
    connection_id: "conn_888",
    opportunity_id: "opp_777",
    opportunity_title: "AI Payment Platform",
    title: "AI Payment Core Collaboration",
    description: "Engineering agreement for core AI processing.",
    status: "ACTIVE",
    status_reason: null,
    accepted_proposal_version: 1,
    agreed_scope_of_work: "Deliver production payment ingestion service.",
    agreed_deliverables: ["API Specs", "Core Service", "Integration Tests"],
    agreed_budget_amount: "15000.00",
    agreed_currency: "USD",
    agreed_timeline_summary: "6 weeks agile cycle",
    agreed_estimated_duration_days: 42,
    agreed_milestones: [
      { title: "Milestone 1: Prototype", amount: 5000, due_days: 14 },
      { title: "Milestone 2: Release", amount: 10000, due_days: 42 },
    ],
    agreed_responsibilities: {
      proposer: "Lead technical architecture and API endpoints",
      recipient: "QA testing and deployment pipelines",
    },
    agreed_assumptions: ["Cloud infrastructure available in week 1"],
    agreed_conditions: ["Approvals within 2 business days"],
    agreed_notes: "Weekly sync Mondays at 10 AM UTC.",
    participants: [
      {
        id: "drp_1",
        user_id: "usr_alice",
        name: "Alice Architect",
        collaboration_role: "Proposer / Initiator",
        assigned_responsibilities: "Lead technical architecture and API endpoints",
        joined_at: "2026-11-02T00:00:00Z",
      },
      {
        id: "drp_2",
        user_id: "usr_bob",
        name: "Bob Founder",
        collaboration_role: "Counterpart / Collaborator",
        assigned_responsibilities: "QA testing and deployment pipelines",
        joined_at: "2026-11-02T00:00:00Z",
      },
    ],
    created_at: "2026-11-02T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
  };

  const sampleOverview: DealRoomOverview = {
    id: "room_123456",
    title: "AI Payment Core Collaboration",
    status: "ACTIVE",
    status_reason: null,
    accepted_proposal_version: 1,
    opportunity_title: "AI Payment Platform",
    participants: sampleRoom.participants,
    scope_preview: "Deliver production payment ingestion service.",
    deliverables_count: 3,
    milestones_count: 2,
    total_budget: "15000.00",
    currency: "USD",
    estimated_duration_days: 42,
    recent_activities: [
      {
        id: "act_1",
        room_id: "room_123456",
        actor_id: "usr_alice",
        actor_name: "Alice Architect",
        activity_type: "ROOM_CREATED",
        title: "Deal Room opened",
        details: "Collaboration workspace initialized from accepted proposal v1.",
        created_at: "2026-11-02T00:00:00Z",
      },
    ],
    open_clarifications_count: 1,
    pinned_notes_count: 1,
    documents_count: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DealRoomsListView with rooms and selects a room", async () => {
    vi.mocked(api.fetchDealRooms).mockResolvedValueOnce({
      items: [sampleRoom],
      total: 1,
    });

    const onSelectRoom = vi.fn();
    render(
      <DealRoomsListView
        currentUser={mockUser}
        onSelectRoom={onSelectRoom}
      />
    );

    expect(await screen.findByText("AI Payment Core Collaboration")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Active Collaboration")).toBeInTheDocument();

    const enterBtn = screen.getByRole("button", { name: /enter workspace/i });
    fireEvent.click(enterBtn);
    expect(onSelectRoom).toHaveBeenCalledWith("room_123456");
  });

  it("renders empty state in DealRoomsListView when no rooms exist", async () => {
    vi.mocked(api.fetchDealRooms).mockResolvedValueOnce({
      items: [],
      total: 0,
    });

    render(
      <DealRoomsListView
        currentUser={mockUser}
        onSelectRoom={vi.fn()}
      />
    );

    expect(await screen.findByText("No Deal Rooms Found")).toBeInTheDocument();
  });

  it("renders DealRoomWorkspaceView with Overview metrics and switches tabs", async () => {
    vi.mocked(api.fetchDealRoomById).mockResolvedValueOnce(sampleRoom);
    vi.mocked(api.fetchDealRoomOverview).mockResolvedValueOnce(sampleOverview);

    render(
      <DealRoomWorkspaceView
        roomId="room_123456"
        currentUser={mockUser}
        onBackToList={vi.fn()}
      />
    );

    expect(await screen.findByText("AI Payment Core Collaboration")).toBeInTheDocument();
    expect(screen.getByText("Agreed Proposal v1")).toBeInTheDocument();

    // Verify key metrics from Overview
    expect(screen.getByText("$15,000.00")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1); // Milestones / documents count
    expect(screen.getByText("3")).toBeInTheDocument(); // Deliverables count
    expect(screen.getByText("Agreed stages")).toBeInTheDocument();

    // Switch to Agreed Terms Tab
    const termsTabBtn = screen.getByRole("button", { name: /agreed terms/i });
    fireEvent.click(termsTabBtn);

    expect(await screen.findByText("Immutable Agreement Record")).toBeInTheDocument();
    expect(screen.getByText(/Deliver production payment ingestion service/)).toBeInTheDocument();
    expect(screen.getByText("API Specs")).toBeInTheDocument();
  });

  it("executes AI Deal Room Copilot with grounded provenance tags", async () => {
    vi.mocked(api.fetchDealRoomById).mockResolvedValueOnce(sampleRoom);
    vi.mocked(api.fetchDealRoomOverview).mockResolvedValueOnce(sampleOverview);
    vi.mocked(api.analyzeDealRoomAI).mockResolvedValueOnce({
      analysis_type: "SUMMARY",
      summary: "AI Payment Core Collaboration has 3 agreed deliverables and 2 milestones totaling $15,000.00 USD.",
      key_findings: [
        "Status is ACTIVE with 2 authorized participants.",
        "Budget is $15,000.00 USD.",
      ],
      actionable_recommendations: [
        "Kickoff architectural review of Milestone 1.",
      ],
      provenance_breakdown: {
        AGREED_TERM: ["Agreed budget of $15,000.00 USD", "3 explicit deliverable(s) defined"],
        AI_SUGGESTION: ["Kickoff architectural review of Milestone 1."],
        VERIFIED_RECORD: ["Deal Room room_123456 in ACTIVE status"],
      },
      mode: "DETERMINISTIC_FALLBACK",
      provider: "deterministic-engine",
      model: "deterministic-rule-engine",
    });

    render(
      <DealRoomWorkspaceView
        roomId="room_123456"
        currentUser={mockUser}
        onBackToList={vi.fn()}
      />
    );

    await screen.findByText("AI Payment Core Collaboration");

    // Click AI Copilot Tab
    const aiTabBtn = screen.getByRole("button", { name: /ai copilot/i });
    fireEvent.click(aiTabBtn);

    expect(await screen.findByText(/AI Payment Core Collaboration has 3 agreed deliverables/)).toBeInTheDocument();
    expect(screen.getByText("Status is ACTIVE with 2 authorized participants.")).toBeInTheDocument();
    expect(screen.getByText("Kickoff architectural review of Milestone 1.")).toBeInTheDocument();
    expect(screen.getByText("Agreed Term")).toBeInTheDocument();
  });

  it("ProposalDetailModal renders Open AI Deal Room button when accepted", () => {
    const acceptedProposal: Proposal = {
      id: "prop_accepted_1",
      connection_id: "conn_1",
      opportunity_id: "opp_1",
      title: "Accepted Proposal",
      description: "Terms agreed.",
      status: "ACCEPTED",
      current_version: 1,
      accepted_version: 1,
      proposer_accepted_at: "2026-11-02T00:00:00Z",
      recipient_accepted_at: "2026-11-02T01:00:00Z",
      proposer: {
        user_id: "usr_alice",
        full_name: "Alice Architect",
        skills: [],
      },
      recipient: {
        user_id: "usr_bob",
        full_name: "Bob Founder",
        skills: [],
      },
      deliverables: ["Specs"],
      milestones: [],
      responsibilities: {},
      assumptions: [],
      conditions: [],
      created_at: "2026-11-02T00:00:00Z",
      updated_at: "2026-11-02T00:00:00Z",
    };

    const onOpenDealRoom = vi.fn();
    render(
      <ProposalDetailModal
        isOpen={true}
        onClose={vi.fn()}
        proposal={acceptedProposal}
        currentUser={mockUser}
        onOpenDealRoom={onOpenDealRoom}
      />
    );

    const dealRoomBtn = screen.getByRole("button", { name: /open ai deal room/i });
    expect(dealRoomBtn).toBeInTheDocument();
    fireEvent.click(dealRoomBtn);
    expect(onOpenDealRoom).toHaveBeenCalledWith("prop_accepted_1");
  });
});

