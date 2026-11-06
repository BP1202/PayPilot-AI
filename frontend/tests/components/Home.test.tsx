import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Home from "@/app/page";
import * as api from "@/lib/api";
import {
  DashboardOverview,
  CopilotRecommendation,
  LedgerListResponse,
  OpportunityListResponse,
  Opportunity,
  User,
} from "@/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchDashboardOverview: vi.fn(),
    fetchCopilotRecommendation: vi.fn(),
    fetchLedgerTransactions: vi.fn(),
    fetchUserOpportunities: vi.fn(),
    fetchOpportunityById: vi.fn(),
    fetchCurrentUser: vi.fn(),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    logoutUser: vi.fn(),
    getAccessToken: vi.fn(),
    getStoredUser: vi.fn(),
    clearAccessToken: vi.fn(),
  };
});

const mockUser: User = {
  id: "usr_alice123",
  email: "alice@example.com",
  full_name: "Alice Builder",
  is_active: true,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

const mockOverview: DashboardOverview = {
  business: {
    id: 1,
    name: "Apex Precision Gearworks",
    currency: "USD",
    industry: "Manufacturing",
    description: "CNC gears",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  },
  totals: {
    business_id: 1,
    currency: "USD",
    total_revenue: "10135.75",
    completed_count: 4,
    pending_count: 1,
    pending_total: "2650.00",
    transaction_count: 5,
  },
};

const mockRecommendation: CopilotRecommendation = {
  title: "Working Capital Acceleration: Capture Order from Stratos Dynamics",
  mode: "DETERMINISTIC_DEMO",
  reasoning: "Ledger analysis confirms $10,135.75 in completed revenue.",
  financial_impact: {
    current_revenue: "10135.75",
    projected_revenue: "12785.75",
    net_change: "2650.00",
    percentage_increase: "26.14",
  },
  suggested_action: {
    action_type: "APPROVE_CUSTOMER_PAYMENT",
    transaction_ref: "TXN-DEMO-202611-005",
    amount: "2650.00",
    currency: "USD",
    customer_name: "Stratos Dynamics",
    rationale: "Confirm and capture pending customer payment.",
  },
  generated_at: "2026-11-03T10:00:00Z",
};

const mockLedger: LedgerListResponse = {
  items: [
    {
      id: 1,
      transaction_ref: "TXN-DEMO-202611-001",
      business_id: 1,
      amount: "4250.00",
      currency: "USD",
      status: "COMPLETED",
      type: "CUSTOMER_PAYMENT",
      payment_method: "PAYPAL_SIMULATED",
      description: "Custom Titanium Helical Gears",
      customer_name: "AeroDrive Systems",
      customer_email: "procurement@aerodrive.demo",
      provider_reference: "SIM-PAYPAL-CAP-001",
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    },
  ],
  total: 1,
};

const mockOpportunity1: Opportunity = {
  id: "opp_alpha",
  user_id: "usr_alice123",
  submission_type: "IDEA",
  status: "ANALYSED",
  visibility: "PRIVATE",
  title: "Automated Drone Fleet Logistics",
  original_description: "Real-time dispatch system for suburban package delivery drones.",
  proposed_solution: "Autonomous ground-based charging pads with mesh networking.",
  problem_statement: "High battery turn times stall rapid suburban delivery.",
  industry: "Aviation & Logistics",
  value_proposition: "Cuts turnaround time by 60%.",
  target_customer_segments: ["Last-mile delivery operators"],
  customer_pain_points: ["Battery charge bottlenecks"],
  required_skills_and_resources: ["Drone avionics", "Software architecture"],
  potential_business_models: ["SaaS charging network"],
  key_assumptions: ["Municipal flight permits granted"],
  risks_and_uncertainties: ["Inclement weather"],
  missing_information: ["Fleet size"],
  suggested_follow_up_questions: ["What is the range per charge?"],
  provenance: {},
  ai_metadata: { mode: "DETERMINISTIC_FALLBACK" },
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
};

const mockOppList: OpportunityListResponse = {
  items: [mockOpportunity1],
  total: 1,
};

describe("Home Page Dashboard & Connectivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
      localStorage.clear();
    }
    vi.mocked(api.getStoredUser).mockReturnValue(null);
    vi.mocked(api.getAccessToken).mockReturnValue(null);
    vi.mocked(api.fetchDashboardOverview).mockResolvedValue(mockOverview);
    vi.mocked(api.fetchCopilotRecommendation).mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(mockLedger);
    vi.mocked(api.fetchUserOpportunities).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(mockUser);
  });

  it("renders action-first opportunity network hero, role indicator, and recommended sample opportunities on homepage", async () => {
    render(<Home />);

    await waitFor(() => {
      // Hero headline
      expect(screen.getAllByText(/Turn Ideas Into Impact/i).length).toBeGreaterThanOrEqual(1);
      // Action-First Buttons for Seeker
      expect(screen.getAllByText("Find Opportunities").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Apply Now")).toBeInTheDocument();
      expect(screen.getByText("Track Progress")).toBeInTheDocument();
      expect(screen.getByText("Build Profile")).toBeInTheDocument();
      // Primary quick CTAs
      expect(screen.getAllByText("Post a Request").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Create Opportunity").length).toBeGreaterThanOrEqual(1);
      // Active role is displayed
      expect(screen.getAllByText("Seeker").length).toBeGreaterThanOrEqual(1);
      // Sample / demo opportunity
      expect(screen.getByText("Automated Financial Reconciliation Engine")).toBeInTheDocument();
    });

    // Commerce Ledger, Copilot Chat, KPI cards, and repetitive marketing are NOT on homepage
    expect(screen.queryByText("Commerce Ledger")).not.toBeInTheDocument();
    expect(screen.queryByText("Copilot Business Assistant")).not.toBeInTheDocument();
    expect(screen.queryByText("Settled Revenue")).not.toBeInTheDocument();
    expect(screen.queryByText("How Opnly Works")).not.toBeInTheDocument();
    expect(screen.queryByText("Built for Commercial Confidence")).not.toBeInTheDocument();
  });

  it("renders data successfully when navigating to Payments & Earnings view", async () => {
    render(<Home />);

    // Click Payments & Earnings in sidebar
    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    await waitFor(() => {
      expect(screen.getByText("Apex Precision Gearworks")).toBeInTheDocument();
      expect(screen.getAllByText("$10,135.75").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText("Working Capital Acceleration: Capture Order from Stratos Dynamics")
      ).toBeInTheDocument();
      expect(screen.getByText("TXN-DEMO-202611-001")).toBeInTheDocument();
    });
  });

  it("renders loading skeleton state in Payments & Earnings while requests are in flight", () => {
    vi.mocked(api.fetchDashboardOverview).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.fetchCopilotRecommendation).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.fetchLedgerTransactions).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<Home />);

    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("displays understandable non-technical error banner and does not fabricate $0.00 financial metrics on failure", async () => {
    vi.mocked(api.fetchDashboardOverview).mockRejectedValue(
      new Error("We're having trouble connecting to your financial records right now. Please check your internet connection or try again.")
    );

    render(<Home />);

    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/trouble connecting to your financial records/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("sanitizes raw technical errors so zero technical jargon or URLs are revealed on the UI", async () => {
    vi.mocked(api.fetchDashboardOverview).mockRejectedValue(
      new Error("Unable to connect to Opnly backend at http://127.0.0.1:8000/api/v1. Status 500.")
    );

    render(<Home />);

    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    await waitFor(() => {
      expect(screen.queryByText(/127\.0\.0\.1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/8000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/backend/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/api/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/status 500/i)).not.toBeInTheDocument();

      expect(
        screen.getByText(/trouble connecting to your financial records/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Connection issue")).toBeInTheDocument();
    });
  });

  it("retries fetching data when Try again button is clicked in Payments & Earnings", async () => {
    vi.mocked(api.fetchDashboardOverview)
      .mockRejectedValueOnce(new Error("Unable to connect to backend server"))
      .mockResolvedValue(mockOverview);
    vi.mocked(api.fetchCopilotRecommendation)
      .mockRejectedValueOnce(new Error("Unable to connect to backend server"))
      .mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions)
      .mockRejectedValueOnce(new Error("Unable to connect to backend server"))
      .mockResolvedValue(mockLedger);

    render(<Home />);

    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    await waitFor(() => {
      expect(screen.getByText(/trouble connecting to your financial records/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText(/trouble connecting to your financial records/i)).not.toBeInTheDocument();
      expect(screen.getAllByText("$10,135.75").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("TXN-DEMO-202611-001")).toBeInTheDocument();
    });

    expect(api.fetchDashboardOverview).toHaveBeenCalledTimes(2);
  });

  it("distinguishes empty ledger state from error state", async () => {
    const emptyLedger: LedgerListResponse = { items: [], total: 0 };
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(emptyLedger);

    render(<Home />);

    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    await waitFor(() => {
      expect(screen.getByText("No transactions match the selected filter.")).toBeInTheDocument();
      expect(screen.queryByText("Connection issue")).not.toBeInTheDocument();
    });
  });

  it("replaces unauthenticated credentials error with a friendly sign-in prompt and Sign In button", async () => {
    vi.mocked(api.fetchDashboardOverview).mockRejectedValue(
      new Error("Authentication credentials were not provided.")
    );

    render(<Home />);

    const ledgerBtn = screen.getByRole("button", { name: /Payments & Earnings/i });
    fireEvent.click(ledgerBtn);

    await waitFor(() => {
      expect(screen.getByText("Sign in to view your personalized dashboard and track your opportunities.")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /^Sign In$/i }).length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("Opportunity Drafts Visibility for Authenticated Users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
    localStorage.setItem("opnly_active_role", "creator");
    vi.mocked(api.getStoredUser).mockReturnValue(mockUser);
    vi.mocked(api.getAccessToken).mockReturnValue("mock_valid_token");
    vi.mocked(api.fetchDashboardOverview).mockResolvedValue(mockOverview);
    vi.mocked(api.fetchCopilotRecommendation).mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(mockLedger);
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.fetchUserOpportunities).mockResolvedValue(mockOppList);
  });

  afterEach(() => {
    localStorage.removeItem("opnly_active_role");
  });

  it("loads and displays authenticated user's opportunities when user has active session", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Automated Drone Fleet Logistics")).toBeInTheDocument();
      expect(screen.getByText("Aviation & Logistics")).toBeInTheDocument();
      expect(screen.getByText("1 Total")).toBeInTheDocument();
    });

    expect(api.fetchUserOpportunities).toHaveBeenCalled();
  });

  it("shows unauthenticated state prompting sign in when no active session exists", async () => {
    vi.mocked(api.getStoredUser).mockReturnValue(null);
    vi.mocked(api.getAccessToken).mockReturnValue(null);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to view your opportunity drafts/i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Automated Drone Fleet Logistics")).not.toBeInTheDocument();
  });

  it("reopens opportunity draft using persisted backend data from fetchOpportunityById", async () => {
    const persistedFullOpp: Opportunity = {
      ...mockOpportunity1,
      title: "Automated Drone Fleet Logistics (Persisted V2)",
      value_proposition: "Authoritative persisted value proposition from PostgreSQL database.",
    };
    vi.mocked(api.fetchOpportunityById).mockResolvedValue(persistedFullOpp);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Automated Drone Fleet Logistics")).toBeInTheDocument();
    });

    // Click on opportunity card to reopen
    const cardTitle = screen.getByText("Automated Drone Fleet Logistics");
    fireEvent.click(cardTitle);

    await waitFor(() => {
      expect(api.fetchOpportunityById).toHaveBeenCalledWith("opp_alpha");
      expect(
        screen.getByText("Edit Opportunity Draft")
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Automated Drone Fleet Logistics (Persisted V2)")
      ).toBeInTheDocument();
    });
  });

  it("clears user-specific opportunity data immediately when user signs out", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Automated Drone Fleet Logistics")).toBeInTheDocument();
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    // Click sign out
    const signOutBtn = screen.getByText("Sign Out");
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(api.logoutUser).toHaveBeenCalled();
      expect(screen.queryByText("Automated Drone Fleet Logistics")).not.toBeInTheDocument();
      expect(
        screen.getByText(/Sign in to view your opportunity drafts/i)
      ).toBeInTheDocument();
    });
  });

  it("handles expired sessions gracefully by clearing stale private data", async () => {
    // When session expires, fetchCurrentUser and fetchUserOpportunities return 401
    vi.mocked(api.fetchCurrentUser).mockRejectedValue(
      new api.ApiError("Authentication token has expired. Please log in again.", 401)
    );
    vi.mocked(api.fetchUserOpportunities).mockRejectedValue(
      new api.ApiError("Authentication token has expired. Please log in again.", 401)
    );

    render(<Home />);

    await waitFor(() => {
      expect(api.clearAccessToken).toHaveBeenCalled();
      expect(screen.queryByText("Automated Drone Fleet Logistics")).not.toBeInTheDocument();
      expect(
        screen.getByText(/Sign in to view your opportunity drafts/i)
      ).toBeInTheDocument();
    });
  });

  it("displays proper error state in opportunity drafts list when request fails and recovers on retry", async () => {
    // First attempt fails with network error, second attempt succeeds
    vi.mocked(api.fetchUserOpportunities)
      .mockRejectedValueOnce(new Error("Unable to connect to opportunity service"))
      .mockResolvedValue(mockOppList);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load opportunities")).toBeInTheDocument();
      expect(
        screen.getByText("We couldn't load your opportunity drafts right now. Please check your connection or try again.")
      ).toBeInTheDocument();
    });

    // Click retry
    const retryBtn = screen.getAllByRole("button", { name: /try again/i })[0];
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Automated Drone Fleet Logistics")).toBeInTheDocument();
      expect(screen.queryByText("Unable to load opportunities")).not.toBeInTheDocument();
    });

    expect(api.fetchUserOpportunities).toHaveBeenCalledTimes(2);
  });
});
