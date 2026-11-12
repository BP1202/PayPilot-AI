import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpportunityStudioModal } from "@/components/OpportunityStudioModal";
import * as api from "@/lib/api";
import { Opportunity, OpportunityAnalyzeResponse } from "@/types";

vi.mock("@/lib/api");

const mockAnalysisResponse: OpportunityAnalyzeResponse = {
  submission_type: "IDEA",
  original_description: "We build machine-learning vibration sensors for industrial wind turbines.",
  analysis: {
    suggested_title: "WindPulse Predictive Gearbox AI",
    problem_statement: "Wind operators suffer catastrophic gearbox failure with zero warning.",
    proposed_solution: "Edge IoT vibration sensors predict failure 6 weeks in advance.",
    target_customer_segments: ["Wind farm operators", "Asset managers"],
    customer_pain_points: ["Extensive downtime costs", "Hazardous manual inspections"],
    value_proposition: "Reduces unexpected turbine downtime by 85%.",
    industry: "Manufacturing & Hardware",
    required_skills_and_resources: ["Vibration signal processing", "Hardware firmware"],
    potential_business_models: ["Hardware + monthly subscription"],
    key_assumptions: ["Operators can retrofit sensors without stopping generation"],
    risks_and_uncertainties: ["Harsh weather damaging sensor exterior"],
    missing_information: ["Number of turbines per operator farm"],
    suggested_follow_up_questions: ["What is your maintenance cycle?"],
    provenance: {
      suggested_title: "AI_SUGGESTION",
      proposed_solution: "USER_PROVIDED",
      problem_statement: "AI_HYPOTHESIS",
      target_customer_segments: "AI_HYPOTHESIS",
      key_assumptions: "AI_HYPOTHESIS",
      missing_information: "MISSING_UNKNOWN",
    },
    ai_metadata: {
      mode: "LIVE_AI",
      provider: "Google Gemini",
      model: "gemini-1.5-flash",
      confidence: 0.92,
    },
  },
  mode: "LIVE_AI",
  provider: "Google Gemini",
  model: "gemini-1.5-flash",
  confidence: 0.92,
  message: "Opportunity analyzed using live AI (Google Gemini gemini-1.5-flash).",
};

const mockSavedOpportunity: Opportunity = {
  id: "opp_test_123",
  user_id: "owner_default",
  submission_type: "IDEA",
  status: "ANALYSED",
  visibility: "PRIVATE",
  title: "WindPulse Predictive Gearbox AI",
  original_description: "We build machine-learning vibration sensors for industrial wind turbines.",
  problem_statement: "Wind operators suffer catastrophic gearbox failure with zero warning.",
  proposed_solution: "Edge IoT vibration sensors predict failure 6 weeks in advance.",
  industry: "Manufacturing & Hardware",
  value_proposition: "Reduces unexpected turbine downtime by 85%.",
  target_customer_segments: ["Wind farm operators", "Asset managers"],
  customer_pain_points: ["Extensive downtime costs"],
  required_skills_and_resources: ["Vibration signal processing"],
  potential_business_models: ["Hardware + monthly subscription"],
  key_assumptions: ["Operators can retrofit sensors without stopping generation"],
  risks_and_uncertainties: ["Harsh weather damaging sensor exterior"],
  missing_information: ["Number of turbines per operator farm"],
  suggested_follow_up_questions: ["What is your maintenance cycle?"],
  provenance: {},
  ai_metadata: {},
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
};

describe("OpportunityStudioModal Component", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <OpportunityStudioModal
        isOpen={false}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
    expect(screen.queryByText(/Idea Capture & Opportunity Studio/i)).not.toBeInTheDocument();
  });

  it("renders Stage 1 capture form and allows type selection and example loading", () => {
    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText(/Idea Capture & Opportunity Studio/i)).toBeInTheDocument();
    expect(screen.getByText("I have an Idea")).toBeInTheDocument();
    expect(screen.getByText("I have a Problem")).toBeInTheDocument();

    // Select PROBLEM
    fireEvent.click(screen.getByText("I have a Problem"));
    expect(screen.getByPlaceholderText(/Describe the specific bottleneck/i)).toBeInTheDocument();

    // Click example text
    fireEvent.click(screen.getByText("Use example text"));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(20);
  });

  it("analyzes submission and presents editable structured review with provenance badges", async () => {
    vi.mocked(api.analyzeOpportunity).mockResolvedValue(mockAnalysisResponse);
    vi.mocked(api.createOpportunity).mockResolvedValue(mockSavedOpportunity);

    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    // Enter description
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: {
        value: "We build machine-learning vibration sensors for industrial wind turbines.",
      },
    });

    // Click Analyze
    const analyzeBtn = screen.getByRole("button", { name: /Analyze with AI Business Analyst/i });
    fireEvent.click(analyzeBtn);

    // Wait for Stage 2 review screen
    await waitFor(() => {
      expect(screen.getByDisplayValue("WindPulse Predictive Gearbox AI")).toBeInTheDocument();
      expect(screen.getByText(/Live AI Analysis/i)).toBeInTheDocument();
      expect(screen.getByText("Wind farm operators")).toBeInTheDocument();
      expect(screen.getByText("User Fact")).toBeInTheDocument();
      expect(screen.getAllByText("AI Hypothesis").length).toBeGreaterThan(0);
      expect(screen.getByText("Needed Context")).toBeInTheDocument();
    });

    // Save draft
    const saveBtn = screen.getByRole("button", { name: /Save Opportunity Draft/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.createOpportunity).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("handles analysis error without crashing and shows friendly notice", async () => {
    vi.mocked(api.analyzeOpportunity).mockRejectedValue(
      new Error("We couldn't analyze your opportunity submission right now. Please try again.")
    );

    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Valid description over 10 chars" } });

    const analyzeBtn = screen.getByRole("button", { name: /Analyze with AI Business Analyst/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText(/We couldn't analyze your opportunity submission/i)).toBeInTheDocument();
    });
  });

  it("publishes an opportunity with selected visibility and notifies on success", async () => {
    vi.mocked(api.updateOpportunity).mockResolvedValue(mockSavedOpportunity);
    vi.mocked(api.publishOpportunity).mockResolvedValue({
      ...mockSavedOpportunity,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      published_at: "2026-11-05T00:00:00Z",
    });

    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        existingOpportunity={mockSavedOpportunity}
      />
    );

    // Switch visibility to Public
    const publicBtn = screen.getByRole("button", { name: "Public" });
    fireEvent.click(publicBtn);

    // Click Publish Opportunity
    const publishBtn = screen.getByRole("button", { name: /Publish Opportunity/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(api.publishOpportunity).toHaveBeenCalledWith(
        mockSavedOpportunity.id,
        expect.anything()
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays validation errors when trying to publish without required fields", async () => {
    const invalidOpp = {
      ...mockSavedOpportunity,
      industry: "", // Missing industry
    };

    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        existingOpportunity={invalidOpp}
      />
    );

    const publishBtn = screen.getByRole("button", { name: /Publish Opportunity/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(screen.getByText(/Opportunity must belong to a specific industry/i)).toBeInTheDocument();
      expect(api.publishOpportunity).not.toHaveBeenCalled();
    });
  });

  it("unpublishes a published opportunity back to draft", async () => {
    const publishedOpp = {
      ...mockSavedOpportunity,
      status: "PUBLISHED" as const,
      visibility: "PUBLIC" as const,
    };
    vi.mocked(api.unpublishOpportunity).mockResolvedValue({
      ...publishedOpp,
      status: "DRAFT",
      visibility: "PRIVATE",
    });

    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        existingOpportunity={publishedOpp}
      />
    );

    const unpublishBtn = screen.getByRole("button", { name: /Unpublish to Draft/i });
    fireEvent.click(unpublishBtn);

    await waitFor(() => {
      expect(api.unpublishOpportunity).toHaveBeenCalledWith(publishedOpp.id);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("closes an opportunity and displays closed state", async () => {
    const publishedOpp = {
      ...mockSavedOpportunity,
      status: "PUBLISHED" as const,
    };
    vi.mocked(api.closeOpportunity).mockResolvedValue({
      ...publishedOpp,
      status: "CLOSED",
      closed_at: "2026-11-05T01:00:00Z",
    });

    render(
      <OpportunityStudioModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        existingOpportunity={publishedOpp}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Close Opportunity/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(api.closeOpportunity).toHaveBeenCalledWith(publishedOpp.id);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
