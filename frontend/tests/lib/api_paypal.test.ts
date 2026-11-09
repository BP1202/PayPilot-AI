import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMilestonePayPalOrder } from "@/lib/api";

describe("createMilestonePayPalOrder API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the correct endpoint and returns typed order response", async () => {
    const mockResponse = {
      transaction_id: "123",
      transaction_ref: "TXN-SETTLE-TEST",
      paypal_order_id: "5O190127TN364715T",
      order_status: "CREATED",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
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

