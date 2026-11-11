import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MilestoneExecutionWorkspace } from "@/components/deal-rooms/MilestoneExecutionWorkspace";
import {
  MilestoneExecution,
  MilestoneListResponse,
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
  analyzeMilestoneAI: vi.fn(),
  createMilestonePayPalOrder: vi.fn(),
  captureMilestonePayPalOrder: vi.fn(),
  fetchMilestoneSettlementStatus: vi.fn(),
  prepareMilestoneSettlement: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-token"),
}));

import * as api from "@/lib/api";

describe("Milestone PayPal Sandbox Payment Integration", () => {
  const mockPayerUser: User = {
    id: "usr_payer_marcus",
    email: "seeker1@opnly.com",
    full_name: "Marcus Vance",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const mockWorkerUser: User = {
    id: "usr_worker_alex",
    email: "solver1@opnly.com",
    full_name: "Alex Chen",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const sampleAgreedMilestones: DealRoomMilestoneItem[] = [
    {
      title: "Architecture Blueprint & Pipeline",
      description: "Deliver modular FastAPI service architecture",
      amount: "5000.00",
      due_days: 14,
    },
  ];

  const approvedMilestone: MilestoneExecution = {
    id: "mil_vance_001",
    room_id: "room_vance_chen",
    source_proposal_id: "prop_vance_chen",
    accepted_proposal_version: 1,
    milestone_index: 0,
    title: "Architecture Blueprint & Pipeline",
    description: "Deliver modular FastAPI service architecture",
    expected_deliverables: ["FastAPI Service", "PostgreSQL Schema"],
    agreed_amount: "5000.00",
    currency: "USD",
    due_days: 14,
    responsible_user: {
      id: "usr_worker_alex",
      user_id: "usr_worker_alex",
      full_name: "Alex Chen",
      email: "solver1@opnly.com",
    },
    reviewer_user: {
      id: "usr_payer_marcus",
      user_id: "usr_payer_marcus",
      full_name: "Marcus Vance",
      email: "seeker1@opnly.com",
    },
    payer_user_id: "usr_payer_marcus",
    payee_user_id: "usr_worker_alex",
    status: "APPROVED",
    payment_readiness: "READY_FOR_PAYMENT_REVIEW",
    current_evidence_submission: {
      id: "evi_001",
      milestone_id: "mil_vance_001",
      room_id: "room_vance_chen",
      submitted_by_id: "usr_worker_alex",
      submitter_name: "Alex Chen",
      submission_version: 1,
      title: "Completed Blueprint",
      description: "FastAPI code completed",
      evidence_type: "CODE_REPOSITORY",
      reference_url: "https://github.com/vance/pipeline",
      attachments: [],
      status: "APPROVED",
      created_at: "2026-11-02T10:00:00Z",
    },
    evidence_submissions_count: 1,
    reviews_count: 1,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-02T12:00:00Z",
  };

  const sampleMilestonesResponse: MilestoneListResponse = {
    total: 1,
    completed_count: 0,
    in_progress_count: 0,
    pending_review_count: 0,
    total_agreed_amount: "5000.00",
    approved_amount: "5000.00",
    items: [approvedMilestone],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValue(sampleMilestonesResponse);
    vi.mocked(api.fetchMilestoneSettlementStatus).mockResolvedValue({
      milestone_id: "mil_vance_001",
      room_id: "room_vance_chen",
      status: "PREPARED",
      payment_readiness: "READY_FOR_PAYMENT_REVIEW",
      agreed_amount: "5000.00",
      currency: "USD",
      payer_user_id: "usr_payer_marcus",
      payee_user_id: "usr_worker_alex",
      transaction_id: "1",
      transaction_ref: "TXN-SETTLE-VANCE-001",
    });
  });

  it("displays clearly visible 'Pay with PayPal (Sandbox)' button for authorized payer on approved milestone", async () => {
    render(
      <MilestoneExecutionWorkspace
        roomId="room_vance_chen"
        currentUser={mockPayerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    // Verify milestone details and payment readiness
    expect(await screen.findByText(/Architecture Blueprint & Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Readiness: Ready for Payment Review/i)).toBeInTheDocument();

    // Verify agreed amount and currency
    expect(screen.getAllByText(/\$5000\.00/i).length).toBeGreaterThanOrEqual(1);

    // Verify payer sees the Pay with PayPal button
    const payBtns = screen.getAllByRole("button", { name: /Pay with PayPal \(Sandbox\)/i });
    expect(payBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("prohibits unauthorized non-payer from initiating payment and shows explanatory restriction", async () => {
    render(
      <MilestoneExecutionWorkspace
        roomId="room_vance_chen"
        currentUser={mockWorkerUser} // Worker, not Payer
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Architecture Blueprint & Pipeline/i)).toBeInTheDocument();

    // The Pay with PayPal button must NOT be available to the worker
    expect(screen.queryByRole("button", { name: /Pay with PayPal \(Sandbox\)/i })).not.toBeInTheDocument();

    // Restriction message explaining that only the client can authorize
    expect(
      screen.getByText(/Only the designated client\/payer \(Marcus Vance\) is authorized to initiate PayPal payments/i)
    ).toBeInTheDocument();
  });

  it("calls createMilestonePayPalOrder with correct room and milestone IDs when payer clicks Pay with PayPal", async () => {
    vi.mocked(api.createMilestonePayPalOrder).mockResolvedValue({
      transaction_id: "1",
      transaction_ref: "TXN-SETTLE-VANCE-001",
      paypal_order_id: "ORDER-PAYPAL-123",
      order_status: "CREATED",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-PAYPAL-123",
      currency: "USD",
      amount: "5000.00",
    });

    render(
      <MilestoneExecutionWorkspace
        roomId="room_vance_chen"
        currentUser={mockPayerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    const payBtn = (await screen.findAllByRole("button", { name: /Pay with PayPal \(Sandbox\)/i }))[0];
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(api.createMilestonePayPalOrder).toHaveBeenCalledWith(
        "room_vance_chen",
        "mil_vance_001",
        expect.stringMatching(/^ord_mil_vance_001_\d+/),
        expect.stringContaining("payment=return"),
        expect.stringContaining("payment=cancelled")
      );
    });
  });

  it("allows verifying and capturing PayPal payment when order is created, updating status to PAID", async () => {
    vi.mocked(api.fetchMilestoneSettlementStatus).mockResolvedValue({
      milestone_id: "mil_vance_001",
      room_id: "room_vance_chen",
      status: "AWAITING_APPROVAL",
      payment_readiness: "READY_FOR_PAYMENT_REVIEW",
      agreed_amount: "5000.00",
      currency: "USD",
      payer_user_id: "usr_payer_marcus",
      payee_user_id: "usr_worker_alex",
      paypal_order_id: "ORDER-PAYPAL-123",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-PAYPAL-123",
    });

    vi.mocked(api.captureMilestonePayPalOrder).mockResolvedValue({
      transaction_id: "1",
      transaction_ref: "TXN-SETTLE-VANCE-001",
      paypal_order_id: "ORDER-PAYPAL-123",
      paypal_capture_id: "CAPTURE-PAYPAL-999",
      capture_status: "COMPLETED",
      transaction_status: "COMPLETED",
      payment_readiness: "PAID",
      currency: "USD",
      amount: "5000.00",
    });

    render(
      <MilestoneExecutionWorkspace
        roomId="room_vance_chen"
        currentUser={mockPayerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    // Verify order ID appears
    expect(await screen.findByText(/Order ID: ORDER-PAYPAL-123/i)).toBeInTheDocument();

    // Verify & Capture button appears
    const captureBtn = screen.getByRole("button", { name: /Verify & Capture Payment/i });
    expect(captureBtn).toBeInTheDocument();

    fireEvent.click(captureBtn);

    await waitFor(() => {
      expect(api.captureMilestonePayPalOrder).toHaveBeenCalledWith(
        "room_vance_chen",
        "mil_vance_001",
        expect.stringMatching(/^cap_mil_vance_001_\d+/)
      );
    });

    // Verify success banner appears
    expect(await screen.findByText(/PayPal Payment Completed!/i)).toBeInTheDocument();
  });

  it("handles payment initiation failure cleanly with an error message and retry option", async () => {
    vi.mocked(api.createMilestonePayPalOrder).mockRejectedValue(
      new Error("PayPal Sandbox service timeout. Please retry.")
    );

    render(
      <MilestoneExecutionWorkspace
        roomId="room_vance_chen"
        currentUser={mockPayerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    const payBtn = (await screen.findAllByRole("button", { name: /Pay with PayPal \(Sandbox\)/i }))[0];
    fireEvent.click(payBtn);

    const errorMessages = await screen.findAllByText(/PayPal Sandbox service timeout\. Please retry\./i);
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Retry Pay with PayPal/i })).toBeInTheDocument();
  });

  it("displays 'Payment Unavailable' when milestone is not yet approved", async () => {
    const inProgressMilestone: MilestoneExecution = {
      ...approvedMilestone,
      status: "IN_PROGRESS",
      payment_readiness: "NOT_READY",
    };

    vi.mocked(api.fetchDealRoomMilestones).mockResolvedValue({
      total: 1,
      completed_count: 0,
      in_progress_count: 1,
      pending_review_count: 0,
      total_agreed_amount: "5000.00",
      approved_amount: "0.00",
      items: [inProgressMilestone],
    });

    render(
      <MilestoneExecutionWorkspace
        roomId="room_vance_chen"
        currentUser={mockPayerUser}
        agreedMilestones={sampleAgreedMilestones}
        currency="USD"
      />
    );

    expect(await screen.findByText(/Payment Unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pay with PayPal \(Sandbox\)/i })).not.toBeInTheDocument();
  });
});
