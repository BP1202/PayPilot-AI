import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMilestonePayPalOrder, captureMilestonePayPalOrder } from "@/lib/api";

describe("PayPal milestone API clients", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createMilestonePayPalOrder", () => {
    it("calls the correct endpoint and returns typed order response", async () => {
      const mockResponse = {
        transaction_id: "123",
        transaction_ref: "TXN-SETTLE-TEST",
        paypal_order_id: "ORDER-MOCK-TEST-001",
        order_status: "CREATED",
        approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-MOCK-TEST-001",
        currency: "USD",
        amount: "1500.00",
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await createMilestonePayPalOrder(
        "room_test_123",
        "milestone_test_456",
        "idemp_key_789"
      );

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/deal-rooms/room_test_123/milestones/milestone_test_456/paypal/create-order");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        idempotency_key: "idemp_key_789",
      });
    });

    it("handles and propagates error safely on API rejection", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Unauthorized payment initiation" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        createMilestonePayPalOrder("room_1", "milestone_1", "key_1")
      ).rejects.toThrow("Unauthorized payment initiation");
    });
  });

  describe("captureMilestonePayPalOrder", () => {
    it("calls capture endpoint and returns verified capture response", async () => {
      const mockCaptureResponse = {
        transaction_id: "123",
        transaction_ref: "TXN-SETTLE-TEST",
        paypal_order_id: "ORDER-MOCK-TEST-001",
        paypal_capture_id: "CAPTURE-MOCK-TEST-001",
        capture_status: "COMPLETED",
        transaction_status: "COMPLETED",
        payment_readiness: "PAID",
        currency: "USD",
        amount: "1500.00",
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCaptureResponse,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await captureMilestonePayPalOrder(
        "room_test_123",
        "milestone_test_456",
        "cap_idemp_001"
      );

      expect(result).toEqual(mockCaptureResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/deal-rooms/room_test_123/milestones/milestone_test_456/paypal/capture-order");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        idempotency_key: "cap_idemp_001",
      });
    });

    it("handles failure when buyer has not approved order", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: "PayPal order has not been approved by the buyer" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        captureMilestonePayPalOrder("room_1", "milestone_1", "cap_idemp_002")
      ).rejects.toThrow("PayPal order has not been approved by the buyer");
    });
  });
});
