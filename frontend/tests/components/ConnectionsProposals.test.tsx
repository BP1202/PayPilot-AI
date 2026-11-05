import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnectionRequestModal } from "@/components/connections/ConnectionRequestModal";
import { ProposalDetailModal } from "@/components/proposals/ProposalDetailModal";
import { ConnectionsProposalsView } from "@/components/connections/ConnectionsProposalsView";
import { Proposal, User } from "@/types";

// Mock API client functions
vi.mock("@/lib/api", () => ({
  sendConnectionRequest: vi.fn(),
  fetchConnectionRequests: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    pending_count: 0,
    accepted_count: 0,
  }),
  respondToConnectionRequest: vi.fn(),
  withdrawConnectionRequest: vi.fn(),
  fetchAcceptedConnections: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    pending_count: 0,
    accepted_count: 0,
  }),
  createProposal: vi.fn(),
  fetchProposals: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
  }),
  fetchProposalById: vi.fn(),
  respondToProposal: vi.fn(),
  fetchCollaborationActivity: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
  }),
  getAccessToken: vi.fn().mockReturnValue("mock-token"),
}));

describe("Connections & Proposals Frontend Components", () => {
  const mockUser: User = {
    id: "usr_alice",
    email: "alice@example.com",
    full_name: "Alice Engineer",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const sampleProposal: Proposal = {
    id: "prop_12345",
    connection_id: "conn_abc",
    opportunity_id: "opp_xyz",
    opportunity_title: "AI Payment Gateway",
    proposer: {
      user_id: "usr_alice",
      full_name: "Alice Engineer",
      headline: "Senior Full Stack Dev",
      industry: "FinTech",
      skills: ["FastAPI", "React"],
    },
    recipient: {
      user_id: "usr_bob",
      full_name: "Bob Founder",
      headline: "Product Creator",
      industry: "E-Commerce",
      skills: ["Strategy"],
    },
    status: "SUBMITTED",
    current_version: 1,
    title: "Full Stack Integration Proposal",
    description: "Scope to connect the backend settlement APIs with Next.js frontend.",
    scope_of_work: "Develop clean REST endpoints and user review interfaces.",
    deliverables: ["FastAPI routers", "Vitest test suites", "Alembic migrations"],
    budget_amount: "4500.00",
    currency: "USD",
    timeline_summary: "3 weeks",
    estimated_duration_days: 21,
    milestones: [
      {
        id: "ms_1",
        title: "Milestone 1: Backend Architecture",
        description: "Models and migrations completed",
        amount: "2000.00",
        target_date: "2026-11-20",
      },
      {
        id: "ms_2",
        title: "Milestone 2: Frontend Integration",
        description: "Components and e2e testing",
        amount: "2500.00",
        target_date: "2026-12-05",
      },
    ],
    responsibilities: {
      proposer: "Deliver production-ready code and tests",
      recipient: "Provide product requirements and timely feedback",
    },
    assumptions: ["Existing database schema is at revision 008"],
    conditions: ["All milestones approved before final delivery"],
    notes: "Excited to collaborate on this initiative.",
    proposer_accepted_at: "2026-11-06T00:00:00Z",
    recipient_accepted_at: null,
    accepted_version: null,
    rejection_reason: null,
    revision_requested_note: null,
    revisions: [
      {
        id: "prev_1",
        version: 1,
        title: "Full Stack Integration Proposal",
        description: "Initial proposal terms",
        deliverables: ["FastAPI routers", "Vitest test suites"],
        budget_amount: "4500.00",
        currency: "USD",
        milestones: [],
        responsibilities: {},
        assumptions: [],
        conditions: [],
        notes: null,
        change_summary: "Initial submission",
        created_by_id: "usr_alice",
        created_at: "2026-11-06T00:00:00Z",
      },
    ],
    created_at: "2026-11-06T00:00:00Z",
    updated_at: "2026-11-06T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ConnectionRequestModal", () => {
    it("renders modal with recipient name, intent selector, and character count", () => {
      render(
        <ConnectionRequestModal
          isOpen={true}
          onClose={vi.fn()}
          recipientUserId="usr_bob"
          recipientName="Bob Founder"
          opportunityId="opp_1"
          opportunityTitle="FinTech Escrow"
        />
      );

      expect(screen.getByText("Send Connection Request")).toBeInTheDocument();
      expect(screen.getByText("Bob Founder")).toBeInTheDocument();
      expect(screen.getByText(/Opportunity:\s*FinTech Escrow/i)).toBeInTheDocument();
      expect(screen.getByText("Collaboration Intent")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Introduce yourself and explain why you'd like to connect/i)
      ).toBeInTheDocument();
    });

    it("validates message length before enabling submission", () => {
      render(
        <ConnectionRequestModal
          isOpen={true}
          onClose={vi.fn()}
          recipientUserId="usr_bob"
          recipientName="Bob Founder"
        />
      );

      const sendButton = screen.getByRole("button", { name: /send request/i });
      expect(sendButton).toBeDisabled();

      const textarea = screen.getByTestId("message-textarea");
      fireEvent.change(textarea, {
        target: { value: "Hello Bob, I am interested in collaborating on this opportunity." },
      });

      expect(sendButton).toBeEnabled();
    });
  });

  describe("ProposalDetailModal", () => {
    it("renders proposal overview, budget amount, deliverables, and milestones", () => {
      render(
        <ProposalDetailModal
          isOpen={true}
          onClose={vi.fn()}
          proposal={sampleProposal}
          currentUser={mockUser}
        />
      );

      expect(screen.getByText("Full Stack Integration Proposal")).toBeInTheDocument();
      expect(screen.getByText("$4,500 USD")).toBeInTheDocument();
      expect(screen.getByText("21 days")).toBeInTheDocument();
      expect(screen.getByText("Milestone 1: Backend Architecture")).toBeInTheDocument();
      expect(screen.getByText("Milestone 2: Frontend Integration")).toBeInTheDocument();
      expect(screen.getByText("FastAPI routers")).toBeInTheDocument();
      expect(screen.getByText("Vitest test suites")).toBeInTheDocument();
    });

    it("displays recipient actions (Accept, Request Changes, Decline) when viewed by recipient", () => {
      const recipientUser: User = {
        id: "usr_bob",
        email: "bob@example.com",
        full_name: "Bob Founder",
        is_active: true,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      };

      render(
        <ProposalDetailModal
          isOpen={true}
          onClose={vi.fn()}
          proposal={sampleProposal}
          currentUser={recipientUser}
        />
      );

      expect(screen.getByRole("button", { name: /accept terms/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
    });

    it("switches to Revision History tab and displays past revisions", () => {
      render(
        <ProposalDetailModal
          isOpen={true}
          onClose={vi.fn()}
          proposal={sampleProposal}
          currentUser={mockUser}
        />
      );

      const historyTab = screen.getByRole("button", { name: /revision history/i });
      fireEvent.click(historyTab);

      expect(screen.getByText("Version 1")).toBeInTheDocument();
      expect(screen.getByText(/Initial submission/i)).toBeInTheDocument();
    });
  });

  describe("ConnectionsProposalsView", () => {
    it("renders unauthenticated sign-in CTA when user is not logged in", () => {
      const onOpenAuth = vi.fn();
      render(
        <ConnectionsProposalsView
          currentUser={null}
          onOpenAuth={onOpenAuth}
        />
      );

      expect(
        screen.getByText(/Sign in to manage your connections, review requests, and collaborate through proposals/i)
      ).toBeInTheDocument();
      const signInBtn = screen.getByRole("button", { name: /sign in to continue/i });
      fireEvent.click(signInBtn);
      expect(onOpenAuth).toHaveBeenCalledTimes(1);
    });

    it("renders tabs and loads data when user is authenticated", async () => {
      render(
        <ConnectionsProposalsView
          currentUser={mockUser}
          onOpenAuth={vi.fn()}
        />
      );

      expect(screen.getByText("Connections & Proposals")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /incoming/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sent/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /connections/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /proposals/i })).toBeInTheDocument();
    });
  });
});
