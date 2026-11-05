import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MilestoneExecutionWorkspace } from "@/components/deal-rooms/MilestoneExecutionWorkspace";
import {
  MilestoneExecution,
  MilestoneListResponse,
  MilestoneAIAnalysisResponse,
  User,
  DealRoomMilestoneItem,
} from "@/types";

// Mock API client functions
vi.mock("@/lib/api", () => ({
  initializeDealRoomMilestones: vi.fn(),
  fetchDealRoomMilestones: vi.fn(),
  fetchDealRoomMilestone: vi.fn(),
  startMilestoneWork: vi.fn(),
  submitMilestoneEvidence: vi.fn(),
  reviewMilestoneEvidence: vi.fn(),
  cancelDealRoomMilestone: vi.fn(),
  fetchMilestonePaymentReadiness: vi.fn(),
  analyzeMilestoneAI: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-token"),
}));

import * as api from "@/lib/api";

describe("Milestone Execution Frontend Module", () => {
  const mockWorkerUser: User = {
    id: "usr_alice",
    email: "alice@example.com",
    full_name: "Alice Architect",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const mockReviewerUser: User = {
    id: "usr_bob",
    email: "bob@example.com",
    full_name: "Bob Reviewer",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const sampleAgreedMilestones: DealRoomMilestoneItem[] = [
    {
      title: "Backend Prototype & OpenAPI Spec",
      description: "Deliver working FastAPI prototype and OpenAPI spec",
      amount: "5000.00",
      due_days: 14,
    },
    {
      title: "Frontend Integration & QA",
      description: "Complete UI integration and test suite",
      amount: "5000.00",
      due_days: 28,
    },
  ];

  const sampleMilestonesResponse: MilestoneListResponse = {
    total: 2,
    completed_count: 0,
    in_progress_count: 1,
    pending_review_count: 0,
    total_agreed_amount: "10000.00",
    approved_amount: "0.00",
    items: [
      {
        id: "ms_111",
        room_id: "room_123",
        source_proposal_id: "prop_999",
        accepted_proposal_version: 1,
        milestone_index: 0,
        title: "Backend Prototype & OpenAPI Spec",
        description: "Deliver working FastAPI prototype and OpenAPI spec",
        expected_deliverables: ["OpenAPI 3.1 Spec", "Docker Container"],
        agreed_amount: "5000.00",
        currency: "USD",
        due_days: 14,
        planned_due_date: null,
        responsible_user: {
          user_id: "usr_alice",
          name: "Alice Architect",
          role: "proposer",
        },
        reviewer_user: {
          user_id: "usr_bob",
          name: "Bob Reviewer",
          role: "recipient",
        },
        status: "NOT_STARTED",
        cancellation_reason: null,
        payment_readiness: "NOT_READY",
        current_evidence_submission: null,
        evidence_submissions_count: 0,
        reviews_count: 0,
        started_at: null,
        submitted_at: null,
        approved_at: null,
        created_at: "2026-11-02T00:00:00Z",
        updated_at: "2026-11-02T00:00:00Z",
      },
      {
        id: "ms_222",
        room_id: "room_123",
        source_proposal_id: "prop_999",
        accepted_proposal_version: 1,
        milestone_index: 1,
        title: "Frontend Integration & QA",
        description: "Complete UI integration and test suite",
        expected_deliverables: ["React Components", "Vitest Suite"],
        agreed_amount: "5000.00",
        currency: "USD",
        due_days: 28,
        planned_due_date: null,
        responsible_user: {
          user_id: "usr_alice",
          name: "Alice Architect",
          role: "proposer",
        },
        reviewer_user: {
          user_id: "usr_bob",
          name: "Bob Reviewer",
          role: "recipient",
        },
        status: "NOT_STARTED",
        cancellation_reason: null,
        payment_readiness: "NOT_READY",
        current_evidence_submission: null,
        evidence_submissions_count: 0,
        reviews_count: 0,
        started_at: null,
        submitted_at: null,
        approved_at: null,
        created_at: "2026-11-02T00:00:00Z",
        updated_at: "2026-11-02T00:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state with initialize button when 0 milestones exist", async () => {
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce({
      items: [],
      total: 0,
      completed_count: 0,
      in_progress_count: 0,
      pending_review_count: 0,
      total_agreed_amount: "0.00",
      approved_amount: "0.00",
    });
    vi.mocked(api.initializeDealRoomMilestones).mockResolvedValueOnce(sampleMilestonesResponse.items);

    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockWorkerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Initialize Milestone Execution/i)).toBeInTheDocument();
    expect(screen.getByText(/Transform the 2 agreed roadmap stages/i)).toBeInTheDocument();

    const initBtn = screen.getByRole("button", { name: /Initialize Milestones from Agreed Terms/i });
    fireEvent.click(initBtn);

    await waitFor(() => {
      expect(api.initializeDealRoomMilestones).toHaveBeenCalledWith("room_123");
    });
  });

  it("renders initialized milestones, budget progress, and deliverables checklist", async () => {
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce(sampleMilestonesResponse);

    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockWorkerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Milestone Execution & Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend Prototype & OpenAPI Spec/i)).toBeInTheDocument();
    expect(screen.getByText(/Frontend Integration & QA/i)).toBeInTheDocument();
    expect(screen.getByText(/OpenAPI 3.1 Spec/i)).toBeInTheDocument();
    expect(screen.getByText(/Docker Container/i)).toBeInTheDocument();

    // Verify budget progress display
    expect(screen.getByText(/\$0\.00 \/ \$10,000\.00 USD/i)).toBeInTheDocument();
  });

  it("responsible worker can start work on a NOT_STARTED milestone", async () => {
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce(sampleMilestonesResponse);
    vi.mocked(api.startMilestoneWork).mockResolvedValueOnce({
      ...sampleMilestonesResponse.items[0],
      status: "IN_PROGRESS",
    });
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce({
      ...sampleMilestonesResponse,
      in_progress_count: 1,
      items: [
        { ...sampleMilestonesResponse.items[0], status: "IN_PROGRESS" },
        sampleMilestonesResponse.items[1],
      ],
    });

    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockWorkerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Backend Prototype & OpenAPI Spec/i)).toBeInTheDocument();

    const startButtons = screen.getAllByRole("button", { name: /Start Work/i });
    expect(startButtons.length).toBeGreaterThan(0);
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(api.startMilestoneWork).toHaveBeenCalledWith("room_123", "ms_111");
    });
  });

  it("responsible worker can open evidence submission modal and submit deliverables", async () => {
    const inProgressList: MilestoneListResponse = {
      ...sampleMilestonesResponse,
      in_progress_count: 1,
      items: [
        { ...sampleMilestonesResponse.items[0], status: "IN_PROGRESS" },
        sampleMilestonesResponse.items[1],
      ],
    };
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce(inProgressList);
    vi.mocked(api.submitMilestoneEvidence).mockResolvedValueOnce({
      id: "ev_111",
      milestone_id: "ms_111",
      room_id: "room_123",
      submitted_by_id: "usr_alice",
      submitter_name: "Alice Architect",
      submission_version: 1,
      title: "FastAPI Implementation Complete",
      description: "Code merged and docs verified.",
      evidence_type: "CODE_REPOSITORY",
      reference_url: "https://github.com/paypilot/backend",
      attachments: [],
      status: "PENDING_REVIEW",
      created_at: "2026-11-02T12:00:00Z",
    });
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce({
      ...sampleMilestonesResponse,
      pending_review_count: 1,
      items: [
        {
          ...sampleMilestonesResponse.items[0],
          status: "SUBMITTED_FOR_REVIEW",
          evidence_submissions_count: 1,
        },
        sampleMilestonesResponse.items[1],
      ],
    });

    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockWorkerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Submit Deliverables/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Submit Deliverables/i }));

    // Modal opens
    expect(await screen.findByText(/Submit Milestone Deliverables/i)).toBeInTheDocument();

    // Fill form
    const urlInput = screen.getByPlaceholderText(/https:\/\/\.\.\./i);
    const descInput = screen.getByPlaceholderText(/Explain what has been completed/i);

    fireEvent.change(urlInput, { target: { value: "https://github.com/paypilot/backend" } });
    fireEvent.change(descInput, { target: { value: "Code merged and docs verified." } });

    const submitBtn = screen.getByRole("button", { name: /Confirm Deliverable Submission/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.submitMilestoneEvidence).toHaveBeenCalledWith(
        "room_123",
        "ms_111",
        expect.objectContaining({
          reference_url: "https://github.com/paypilot/backend",
          description: "Code merged and docs verified.",
        })
      );
    });
  });

  it("enforces dual consent: responsible worker cannot approve their own milestone (no review button, restricted label)", async () => {
    const underReviewList: MilestoneListResponse = {
      ...sampleMilestonesResponse,
      pending_review_count: 1,
      items: [
        {
          ...sampleMilestonesResponse.items[0],
          status: "SUBMITTED_FOR_REVIEW",
          current_evidence_submission: {
            id: "ev_111",
            milestone_id: "ms_111",
            room_id: "room_123",
            submitted_by_id: "usr_alice",
            submitter_name: "Alice Architect",
            submission_version: 1,
            title: "FastAPI Implementation Complete",
            description: "Code merged and docs verified.",
            evidence_type: "CODE_REPOSITORY",
            reference_url: "https://github.com/paypilot/backend",
            attachments: [],
            status: "PENDING_REVIEW",
            created_at: "2026-11-02T12:00:00Z",
          },
        },
        sampleMilestonesResponse.items[1],
      ],
    };

    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce(underReviewList);

    // Render with mockWorkerUser (Alice, who submitted)
    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockWorkerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Awaiting Counterparty Review \(Self-Approval Restricted\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review Deliverables/i })).not.toBeInTheDocument();
  });

  it("designated reviewer can review deliverables, approve work, and see Payment Readiness banner", async () => {
    const underReviewList: MilestoneListResponse = {
      ...sampleMilestonesResponse,
      pending_review_count: 1,
      items: [
        {
          ...sampleMilestonesResponse.items[0],
          status: "SUBMITTED_FOR_REVIEW",
          current_evidence_submission: {
            id: "ev_111",
            milestone_id: "ms_111",
            room_id: "room_123",
            submitted_by_id: "usr_alice",
            submitter_name: "Alice Architect",
            submission_version: 1,
            title: "FastAPI Implementation Complete",
            description: "Code merged and docs verified.",
            evidence_type: "CODE_REPOSITORY",
            reference_url: "https://github.com/paypilot/backend",
            attachments: [],
            status: "PENDING_REVIEW",
            created_at: "2026-11-02T12:00:00Z",
          },
        },
        sampleMilestonesResponse.items[1],
      ],
    };

    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce(underReviewList);
    vi.mocked(api.reviewMilestoneEvidence).mockResolvedValueOnce({
      ...underReviewList.items[0],
      status: "APPROVED",
      payment_readiness: "READY_FOR_PAYMENT_REVIEW",
      approved_at: "2026-11-02T14:00:00Z",
    });
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce({
      ...sampleMilestonesResponse,
      completed_count: 1,
      pending_review_count: 0,
      approved_amount: "5000.00",
      items: [
        {
          ...underReviewList.items[0],
          status: "APPROVED",
          payment_readiness: "READY_FOR_PAYMENT_REVIEW",
          approved_at: "2026-11-02T14:00:00Z",
        },
        sampleMilestonesResponse.items[1],
      ],
    });

    // Render with mockReviewerUser (Bob, reviewer)
    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockReviewerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    const reviewBtn = await screen.findByRole("button", { name: /Review Deliverables/i });
    fireEvent.click(reviewBtn);

    expect(await screen.findByText(/Review Deliverables: Backend Prototype & OpenAPI Spec/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Approval/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.reviewMilestoneEvidence).toHaveBeenCalledWith(
        "room_123",
        "ms_111",
        expect.objectContaining({
          evidence_id: "ev_111",
          decision: "APPROVED",
        })
      );
    });

    // After reload, Payment Readiness banner appears
    expect(await screen.findByText(/Payment Readiness: Ready for Payment Review/i)).toBeInTheDocument();
  });

  it("AI Review Assistant renders completeness score, checklist, and provenance tags", async () => {
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValueOnce(sampleMilestonesResponse);

    const mockAiResponse: MilestoneAIAnalysisResponse = {
      milestone_id: "ms_111",
      completeness_score: 95,
      deliverables_analysis: [
        {
          deliverable: "OpenAPI 3.1 Spec",
          satisfied: true,
          confidence: 0.95,
          explanation: "Valid OpenAPI schema located at deliverable URL.",
        },
        {
          deliverable: "Docker Container",
          satisfied: true,
          confidence: 0.9,
          explanation: "Dockerfile and build config verified.",
        },
      ],
      review_checklist: [
        "Verify all query parameters are documented",
        "Check environment variable config in container",
      ],
      observations: ["Deliverable matches agreed proposal scope."],
      provenance_breakdown: {
        AGREED_TERM: ["Scope specifications from Proposal v1"],
        USER_SUBMITTED_EVIDENCE: ["Submission reference repository link"],
        VERIFIED_APPLICATION_RECORD: ["Milestone database status IN_PROGRESS"],
      },
      mode: "DETERMINISTIC_FALLBACK",
      provider: "google-gemini",
      model: "gemini-1.5-flash",
    };

    vi.mocked(api.analyzeMilestoneAI).mockResolvedValueOnce(mockAiResponse);

    render(
      <MilestoneExecutionWorkspace
        roomId="room_123"
        currentUser={mockWorkerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Backend Prototype & OpenAPI Spec/i)).toBeInTheDocument();

    const aiButtons = screen.getAllByRole("button", { name: /AI Review Assistant/i });
    fireEvent.click(aiButtons[0]);

    expect(await screen.findByText(/AI Deliverable Verification Copilot/i)).toBeInTheDocument();
    expect(await screen.findAllByText(/95%/)).toHaveLength(2);
    expect(screen.getByText(/Valid OpenAPI schema located at deliverable URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Verify all query parameters are documented/i)).toBeInTheDocument();
    expect(screen.getByText(/Human Control & Advisory Disclaimer/i)).toBeInTheDocument();
  });
});
