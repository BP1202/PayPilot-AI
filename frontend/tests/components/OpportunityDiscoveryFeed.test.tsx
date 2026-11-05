import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpportunityDiscoveryFeed } from "@/components/discovery/OpportunityDiscoveryFeed";
import * as api from "@/lib/api";
import { OpportunityDiscoveryResponse, OpportunityPublic } from "@/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchPublishedOpportunities: vi.fn(),
  };
});

const mockOpportunities: OpportunityPublic[] = [
  {
    id: "opp_pub_1",
    submission_type: "IDEA",
    intent: "OFFERING_SOLUTION",
    category: "TECH",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: "AgriDrone Crop Inspection",
    industry: "Agriculture",
    value_proposition: "Reduce crop scouting time by 80%.",
    problem_statement: "Farmers walk 50 acres daily manually.",
    proposed_solution: "Automated multispectral drone flights.",
    required_skills_and_resources: ["Drone Piloting", "Computer Vision", "Python"],
    target_customer_segments: ["Commercial Grain Farmers"],
    customer_pain_points: ["Manual scouting delay", "Pest outbreak oversight"],
    potential_business_models: ["SaaS per acre"],
    key_assumptions: ["Farmers have stable broadband"],
    risks_and_uncertainties: ["Regulatory flight permits"],
    missing_information: [],
    suggested_follow_up_questions: [],
    business_name: "Apex Precision Robotics",
    published_at: "2026-11-05T01:00:00Z",
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T01:00:00Z",
  },
  {
    id: "opp_pub_2",
    submission_type: "PROBLEM",
    intent: "SEEKING_SOLUTION",
    category: "FINTECH",
    status: "PUBLISHED",
    visibility: "AUTHENTICATED",
    title: "Regional Cross-Border Payment Bottleneck",
    industry: "Banking & Payments",
    value_proposition: "Cut cross-border remittance fees to under 1%.",
    problem_statement: "Wire transfers take 4 business days with 6% FX fees.",
    proposed_solution: "Stablecoin liquidity rails with local bank offramps.",
    required_skills_and_resources: ["PCI-DSS", "FastAPI", "Ledger Accounting"],
    target_customer_segments: ["SMB Importers"],
    customer_pain_points: ["High currency conversion losses"],
    potential_business_models: ["Transaction fee margin"],
    key_assumptions: ["Local banking licenses obtainable"],
    risks_and_uncertainties: ["Regulatory compliance volatility"],
    missing_information: [],
    suggested_follow_up_questions: [],
    published_at: "2026-11-05T02:00:00Z",
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T02:00:00Z",
  },
];

const mockDiscoveryResponse: OpportunityDiscoveryResponse = {
  items: mockOpportunities,
  total: 2,
  page: 1,
  limit: 9,
  pages: 1,
};

describe("OpportunityDiscoveryFeed Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders discovery header and loading skeleton initially", () => {
    vi.mocked(api.fetchPublishedOpportunities).mockReturnValue(new Promise(() => {}));

    render(<OpportunityDiscoveryFeed />);

    expect(screen.getByText(/Opportunity Discovery Network/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Discover Verified Opportunities & Needs/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("discovery-loading")).toBeInTheDocument();
  });

  it("renders opportunity cards with intent, category, skills and company attribution", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue(mockDiscoveryResponse);

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(screen.getByText("AgriDrone Crop Inspection")).toBeInTheDocument();
      expect(
        screen.getByText("Regional Cross-Border Payment Bottleneck")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Offering")).toBeInTheDocument();
    expect(screen.getByText("Seeking")).toBeInTheDocument();
    expect(screen.getByText("TECH")).toBeInTheDocument();
    expect(screen.getByText("FINTECH")).toBeInTheDocument();
    expect(screen.getByText("Apex Precision Robotics")).toBeInTheDocument();
    expect(screen.getByText("Drone Piloting")).toBeInTheDocument();
    expect(screen.getByTestId("discovery-results-count")).toHaveTextContent("Showing 2 of 2 published opportunities");
  });

  it("triggers search filter on text input", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue(mockDiscoveryResponse);

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(screen.getByText("AgriDrone Crop Inspection")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /Search opportunities by title, problem, industry, or skills/i
    );
    fireEvent.change(searchInput, { target: { value: "drone" } });

    await waitFor(() => {
      expect(api.fetchPublishedOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "drone",
        })
      );
    });
  });

  it("filters by Intent when clicking Seeking Solutions pill", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue(mockDiscoveryResponse);

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(screen.getByText("AgriDrone Crop Inspection")).toBeInTheDocument();
    });

    const seekingBtn = screen.getByRole("button", { name: "Seeking Solutions" });
    fireEvent.click(seekingBtn);

    await waitFor(() => {
      expect(api.fetchPublishedOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: "SEEKING_SOLUTION",
          page: 1,
        })
      );
    });
  });

  it("filters by Category when clicking category pill", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue(mockDiscoveryResponse);

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(screen.getByText("AgriDrone Crop Inspection")).toBeInTheDocument();
    });

    const fintechBtn = screen.getByRole("button", { name: "Fintech" });
    fireEvent.click(fintechBtn);

    await waitFor(() => {
      expect(api.fetchPublishedOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "FINTECH",
        })
      );
    });
  });

  it("renders empty state and allows resetting filters", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 9,
      pages: 1,
    });

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(
        screen.getByText("No matching opportunities found")
      ).toBeInTheDocument();
    });

    // Type into search to make filters active
    const searchInput = screen.getByPlaceholderText(
      /Search opportunities by title, problem, industry, or skills/i
    );
    fireEvent.change(searchInput, { target: { value: "UnknownTerm" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe("");
    });
  });

  it("displays friendly error message on network failure and handles retry", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockRejectedValue(
      new Error("We're having trouble loading the opportunity network. Please check your connection and try again.")
    );

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /We're having trouble loading the opportunity network/i
        )
      ).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Try again/i });
    expect(retryBtn).toBeInTheDocument();

    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue(mockDiscoveryResponse);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("AgriDrone Crop Inspection")).toBeInTheDocument();
    });
  });

  it("opens detail modal when clicking an opportunity card", async () => {
    vi.mocked(api.fetchPublishedOpportunities).mockResolvedValue(mockDiscoveryResponse);

    render(<OpportunityDiscoveryFeed />);

    await waitFor(() => {
      expect(screen.getByText("AgriDrone Crop Inspection")).toBeInTheDocument();
    });

    const card = screen.getByText("AgriDrone Crop Inspection");
    fireEvent.click(card);

    await waitFor(() => {
      const modal = screen.getByTestId("opportunity-detail-modal");
      expect(modal).toBeInTheDocument();
      expect(
        within(modal).getByText("Reduce crop scouting time by 80%.")
      ).toBeInTheDocument();
      expect(
        within(modal).getByText("Automated multispectral drone flights.")
      ).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByTestId("opportunity-detail-modal")
      ).not.toBeInTheDocument();
    });
  });
});
