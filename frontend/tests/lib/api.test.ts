import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getApiBaseUrl,
  fetchDashboardOverview,
  fetchLedgerTransactions,
  fetchCopilotRecommendation,
  sendCopilotChat,
  approvePayment,
  extractBusinessProfile,
  createBusinessProfile,
  fetchMyBusiness,
  ApiError,
} from "@/lib/api";

describe("API Client & Connectivity", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("API Base URL Resolution", () => {
    it("resolves default API base URL when NEXT_PUBLIC_API_URL is unset", () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000/api/v1");
    });

    it("resolves custom API base URL when NEXT_PUBLIC_API_URL is configured", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1";
      expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
    });

    it("strips trailing slashes from API base URL", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1/";
      expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
    });

    it("trims whitespace from API base URL", () => {
      process.env.NEXT_PUBLIC_API_URL = "  http://localhost:8000/api/v1  ";
      expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
    });
  });

  describe("Successful API Responses", () => {
    it("fetches dashboard overview successfully", async () => {
      const mockOverview = {
        business: {
          id: 1,
          name: "Apex Precision Gearworks",
          currency: "USD",
          industry: "Manufacturing",
          description: "CNC",
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

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockOverview,
      } as unknown as Response);

      const result = await fetchDashboardOverview();
      expect(result).toEqual(mockOverview);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/dashboard/overview",
        expect.objectContaining({ cache: "no-store" })
      );
    });

    it("fetches ledger transactions without status filter", async () => {
      const mockLedger = { items: [], total: 0 };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockLedger,
      } as unknown as Response);

      const result = await fetchLedgerTransactions();
      expect(result).toEqual(mockLedger);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/ledger",
        expect.objectContaining({ cache: "no-store" })
      );
    });

    it("fetches ledger transactions with status filter", async () => {
      const mockLedger = { items: [], total: 0 };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockLedger,
      } as unknown as Response);

      const result = await fetchLedgerTransactions("COMPLETED");
      expect(result).toEqual(mockLedger);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/ledger?status=COMPLETED",
        expect.objectContaining({ cache: "no-store" })
      );
    });

    it("fetches copilot recommendation successfully", async () => {
      const mockRec = {
        title: "Working Capital Acceleration",
        mode: "DETERMINISTIC_DEMO",
        reasoning: "Analysis",
        financial_impact: {
          current_revenue: "10135.75",
          projected_revenue: "12785.75",
          net_change: "2650.00",
          percentage_increase: "26.14",
        },
        suggested_action: null,
        generated_at: "2026-11-03T10:00:00Z",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockRec,
      } as unknown as Response);

      const result = await fetchCopilotRecommendation();
      expect(result).toEqual(mockRec);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/copilot/recommendation",
        expect.objectContaining({ cache: "no-store" })
      );
    });

    it("sends copilot chat query and returns response", async () => {
      const mockChat = {
        reply: "Verified settled revenue is $10,135.75.",
        mode: "DETERMINISTIC_DEMO",
        confidence: 1.0,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockChat,
      } as unknown as Response);

      const result = await sendCopilotChat("What is our revenue?");
      expect(result).toEqual(mockChat);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/copilot/chat",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ prompt: "What is our revenue?" }),
        })
      );
    });

    it("extracts business profile suggestions from description", async () => {
      const mockExtraction = {
        name: "ABC Company",
        description: "Electronics wholesaler",
        industry: "Electronics",
        business_type: "Wholesaler",
        country: "India",
        website: "",
        currency: "INR",
        confidence: 0.9,
        extracted_fields: ["name", "industry", "business_type", "country", "currency"],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockExtraction,
      } as unknown as Response);

      const result = await extractBusinessProfile("ABC Company description");
      expect(result).toEqual(mockExtraction);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/business/extract",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: "ABC Company description" }),
        })
      );
    });

    it("creates a new business profile and persists to database", async () => {
      const payload = {
        name: "ABC Company",
        currency: "INR",
        industry: "Electronics",
        business_type: "Wholesaler",
        country: "India",
        website: "",
      };

      const mockCreated = {
        id: 10,
        ...payload,
        user_id: "owner_default",
        created_at: "2026-11-03T12:00:00Z",
        updated_at: "2026-11-03T12:00:00Z",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreated,
      } as unknown as Response);

      const result = await createBusinessProfile(payload);
      expect(result).toEqual(mockCreated);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/business",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        })
      );
    });

    it("fetches active business profile for authenticated user", async () => {
      const mockBiz = {
        id: 10,
        name: "ABC Company",
        currency: "INR",
        user_id: "owner_default",
        created_at: "2026-11-03T12:00:00Z",
        updated_at: "2026-11-03T12:00:00Z",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockBiz,
      } as unknown as Response);

      const result = await fetchMyBusiness();
      expect(result).toEqual(mockBiz);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/v1/business/me",
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      );
    });
  });

  describe("Error Handling & Understandable Messages", () => {
    it("handles network failure (Failed to fetch) with an understandable non-technical error message", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(fetchDashboardOverview()).rejects.toThrow(
        /trouble connecting to your financial records/i
      );
    });

    it("handles backend error response without leaking technical stack trace details", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Database connection failed at psycopg2.connect()" }),
      } as unknown as Response);

      await expect(fetchDashboardOverview()).rejects.toThrow(
        /couldn't retrieve your financial information/i
      );
    });

    it("handles backend 404 response with user-friendly fallback", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => {
          throw new Error("Not json");
        },
      } as unknown as Response);

      await expect(fetchDashboardOverview()).rejects.toThrow(
        /couldn't retrieve your financial information/i
      );
    });

    it("handles copilot API chat request failure cleanly and warmly", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(sendCopilotChat("Explain revenue")).rejects.toThrow(
        /unable to answer right now/i
      );
    });
  });
});
