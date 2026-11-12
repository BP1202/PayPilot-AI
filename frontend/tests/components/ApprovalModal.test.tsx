import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApprovalModal } from "@/components/ApprovalModal";
import * as api from "@/lib/api";

describe("ApprovalModal Component", () => {
  const action = {
    action_type: "APPROVE_CUSTOMER_PAYMENT",
    transaction_ref: "TXN-DEMO-005",
    amount: "2650.00",
    currency: "USD",
    customer_name: "Stratos Dynamics",
    rationale: "Capture pending order",
  };

  it("requires explicit checkbox confirmation before enabling capture button", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <ApprovalModal
        isOpen={true}
        onClose={onClose}
        action={action}
        onSuccess={onSuccess}
      />
    );

    const approveButton = screen.getByRole("button", { name: /authorize & capture/i });
    expect(approveButton).toBeDisabled();

    // Check confirmation checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(approveButton).not.toBeDisabled();

    // Mock approvePayment API
    vi.spyOn(api, "approvePayment").mockResolvedValue({
      id: 5,
      transaction_ref: "TXN-DEMO-005",
      business_id: 1,
      amount: "2650.00",
      currency: "USD",
      status: "COMPLETED",
      type: "CUSTOMER_PAYMENT",
      payment_method: "PAYPAL_SIMULATED",
      provider_reference: "SIM-PAYPAL-CAP-123",
      created_at: "2026-11-01T12:00:00Z",
      updated_at: "2026-11-01T12:05:00Z",
    });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

