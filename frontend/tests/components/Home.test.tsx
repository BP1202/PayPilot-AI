import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "@/app/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api");

const mockOverview: api.DashboardOverview = {
  business: {
    id: 1,
    name: "Apex Precision Gearworks",
    currency: "USD",
    industry: "Manufacturing",
    description: "CNC gears",
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

const mockRecommendation: api.CopilotRecommendation = {
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

const mockLedger: api.LedgerListResponse = {
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

describe("Home Page Dashboard & Connectivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton state while requests are in flight", () => {
    vi.mocked(api.fetchDashboardOverview).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.fetchCopilotRecommendation).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.fetchLedgerTransactions).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<Home />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("renders data successfully when API requests resolve", async () => {
    vi.mocked(api.fetchDashboardOverview).mockResolvedValue(mockOverview);
    vi.mocked(api.fetchCopilotRecommendation).mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(mockLedger);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Apex Precision Gearworks")).toBeInTheDocument();
      expect(screen.getAllByText("$10,135.75").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Working Capital Acceleration: Capture Order from Stratos Dynamics")).toBeInTheDocument();
      expect(screen.getByText("TXN-DEMO-202611-001")).toBeInTheDocument();
    });
  });

  it("displays understandable non-technical error banner and does not fabricate $0.00 financial metrics on failure", async () => {
    vi.mocked(api.fetchDashboardOverview).mockRejectedValue(
      new Error("We're having trouble connecting to your financial records right now. Please check your internet connection or try again.")
    );
    vi.mocked(api.fetchCopilotRecommendation).mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(mockLedger);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/trouble connecting to your financial records/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    // When an error occurs and totals are unavailable, financial metrics must not fabricate "$0.00"
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("sanitizes raw technical errors so zero technical jargon or URLs are revealed on the UI", async () => {
    vi.mocked(api.fetchDashboardOverview).mockRejectedValue(
      new Error("Unable to connect to PayPilot backend at http://127.0.0.1:8000/api/v1. Status 500.")
    );
    vi.mocked(api.fetchCopilotRecommendation).mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(mockLedger);

    render(<Home />);

    await waitFor(() => {
      // Must NOT contain technical URL or backend terms
      expect(screen.queryByText(/127\.0\.0\.1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/8000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/backend/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/api/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/status 500/i)).not.toBeInTheDocument();

      // Must display friendly user copy
      expect(
        screen.getByText(/trouble connecting to your financial records/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Connection issue")).toBeInTheDocument();
    });
  });

  it("retries fetching data when Try again button is clicked", async () => {
    // 1st attempt fails, subsequent attempts succeed
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
    const emptyLedger: api.LedgerListResponse = { items: [], total: 0 };

    vi.mocked(api.fetchDashboardOverview).mockResolvedValue(mockOverview);
    vi.mocked(api.fetchCopilotRecommendation).mockResolvedValue(mockRecommendation);
    vi.mocked(api.fetchLedgerTransactions).mockResolvedValue(emptyLedger);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("No transactions match the selected filter.")).toBeInTheDocument();
      expect(screen.queryByText("Connection issue")).not.toBeInTheDocument();
    });
  });
});
