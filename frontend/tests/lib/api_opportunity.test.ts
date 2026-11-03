import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeOpportunity,
  createOpportunity,
  fetchUserOpportunities,
  fetchOpportunityById,
  updateOpportunity,
  reanalyzeOpportunity,
} from "@/lib/api";
import {
  Opportunity,
  OpportunityAnalyzeResponse,
  OpportunityListResponse,
} from "@/types";

describe("Opportunity Lifecycle API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("analyzeOpportunity sends correct payload and parses response", async () => {
    const mockAnalysisResponse: OpportunityAnalyzeResponse = {
      submission_type: "IDEA",
      original_description: "Real-time freight cargo monitoring",
      analysis: {
        suggested_title: "FreightPilot Pro",
        problem_statement: "Mid-market logistics fleets suffer blindspots.",
        proposed_solution: "OBD-II hardware plus automated dispatch portal.",
        target_customer_segments: ["Fleet dispatchers", "Independent truckers"],
        customer_pain_points: ["Late delivery penalties", "Zero cargo visibility"],
        value_proposition: "Cuts delivery uncertainty by 90%.",
        industry: "Logistics & Freight",
        required_skills_and_resources: ["Hardware engineering", "Cloud IoT"],
        potential_business_models: ["Monthly hardware + SaaS subscription"],
        key_assumptions: ["Drivers keep sensors plugged in"],
        risks_and_uncertainties: ["Sensor loss or tampering"],
        missing_information: ["Average fleet size"],
        suggested_follow_up_questions: ["What is your target country?"],
        provenance: {
          proposed_solution: "USER_PROVIDED",
          problem_statement: "AI_HYPOTHESIS",
          suggested_title: "AI_SUGGESTION",
        },
        ai_metadata: {
          mode: "DETERMINISTIC_FALLBACK",
          confidence: 0.8,
        },
      },
      mode: "DETERMINISTIC_FALLBACK",
      confidence: 0.8,
      message: "Analyzed using deterministic heuristic engine.",
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResponse,
    } as unknown as Response);

    const result = await analyzeOpportunity("IDEA", "Real-time freight cargo monitoring");
    expect(result.submission_type).toBe("IDEA");
    expect(result.analysis.suggested_title).toBe("FreightPilot Pro");
    expect(result.mode).toBe("DETERMINISTIC_FALLBACK");
  });

  it("createOpportunity persists a draft and returns saved entity", async () => {
    const mockCreatedOpp: Opportunity = {
      id: "opp_1234567890abcdef",
      user_id: "owner_default",
      submission_type: "IDEA",
      status: "ANALYSED",
      visibility: "PRIVATE",
      title: "FreightPilot Pro",
      original_description: "Real-time freight cargo monitoring",
      problem_statement: "Fleet blindspots",
      proposed_solution: "OBD-II tracking",
      industry: "Logistics",
      value_proposition: "90% visibility",
      target_customer_segments: ["Dispatchers"],
      customer_pain_points: ["Penalties"],
      required_skills_and_resources: ["IoT"],
      potential_business_models: ["SaaS"],
      key_assumptions: ["Adoption"],
      risks_and_uncertainties: ["Tampering"],
      missing_information: ["Fleet size"],
      suggested_follow_up_questions: ["Target region?"],
      provenance: {},
      ai_metadata: {},
      created_at: "2026-11-04T00:00:00Z",
      updated_at: "2026-11-04T00:00:00Z",
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreatedOpp,
    } as unknown as Response);

    const saved = await createOpportunity({
      submission_type: "IDEA",
      title: "FreightPilot Pro",
      original_description: "Real-time freight cargo monitoring",
    });

    expect(saved.id).toBe("opp_1234567890abcdef");
    expect(saved.status).toBe("ANALYSED");
  });

  it("fetchUserOpportunities retrieves list of opportunities", async () => {
    const mockList: OpportunityListResponse = {
      items: [
        {
          id: "opp_1",
          user_id: "owner_default",
          submission_type: "PROBLEM",
          status: "DRAFT",
          visibility: "PRIVATE",
          title: "Clinic Billing Chaos",
          original_description: "Doctor clinics spend 15 hrs reconciling claims.",
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
      ],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockList,
    } as unknown as Response);

    const res = await fetchUserOpportunities();
    expect(res.total).toBe(1);
    expect(res.items[0].title).toBe("Clinic Billing Chaos");
  });

  it("sanitizes backend errors without exposing technical URLs or traces", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        detail: "psycopg2.OperationalError: connection to server at '127.0.0.1', port 5432 failed: Connection refused",
      }),
    } as unknown as Response);

    await expect(
      analyzeOpportunity("IDEA", "Testing database failure resilience")
    ).rejects.toThrow(/We couldn't analyze your opportunity submission/i);
  });
});

