import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvoiceModal } from "@/components/invoicing/InvoiceModal";
import { Transaction, Business, User } from "@/types";
import * as api from "@/lib/api";
import * as invoiceGen from "@/lib/invoiceGenerator";

vi.mock("@/lib/api", () => ({
  createMilestonePayPalOrder: vi.fn(),
  prepareMilestoneSettlement: vi.fn(),
  fetchMilestoneSettlementStatus: vi.fn(),
  approvePayment: vi.fn(),
}));

describe("InvoiceModal Component & Download Flow", () => {
  const mockBusiness: Business = {
    id: 1,
    name: "Apex Precision Gearworks",
    currency: "USD",
    country: "United States",
  };

  const mockUser: User = {
    id: "usr_vance_01",
    email: "seeker1@opnly.com",
    full_name: "Marcus Vance",
    is_active: true,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  };

  const pendingMilestoneTx: Transaction = {
    id: 101,
    transaction_ref: "TXN-SETTLE-VANCE-001",
    business_id: 1,
    amount: "5000.00",
    currency: "USD",
    status: "PENDING",
    type: "CUSTOMER_PAYMENT",
    payment_method: "PAYPAL_SANDBOX",
    description: "Milestone 1 - Distributed Ingestion Architecture",
    customer_name: "Marcus Vance",
    customer_email: "seeker1@opnly.com",
    deal_room_id: "room_vance_chen",
    milestone_id: "mil_7c757d229a47",
    payer_user_id: "usr_vance_01",
    payee_user_id: "usr_alex_02",
    created_at: "2026-11-05T12:00:00Z",
    updated_at: "2026-11-05T12:00:00Z",
  };

  const completedTx: Transaction = {
    id: 102,
    transaction_ref: "TXN-DEMO-202611-001",
    business_id: 1,
    amount: "4250.00",
    currency: "USD",
    status: "COMPLETED",
    type: "CUSTOMER_PAYMENT",
    payment_method: "PAYPAL_SANDBOX",
    description: "Invoice #1042 - Custom Titanium Helical Gears",
    customer_name: "AeroDrive Systems",
    paypal_capture_id: "CAP-TEST-12345",
    paypal_order_id: "ORD-TEST-67890",
    created_at: "2026-11-03T10:00:00Z",
    updated_at: "2026-11-03T10:05:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invoice details with INV- formatted reference, amount, and parties", () => {
    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={completedTx}
        business={mockBusiness}
        currentUser={mockUser}
      />
    );

    expect(screen.getByText(/INV-DEMO-202611-001/i)).toBeInTheDocument();
    expect(screen.getByText(/PAID & SETTLED/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$4,250\.00/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/AeroDrive Systems/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Vance/i)).toBeInTheDocument();
  });

  it("renders pending release badge and direct Pay with PayPal button when unpaid", () => {
    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={pendingMilestoneTx}
        business={mockBusiness}
        currentUser={mockUser}
      />
    );

    expect(screen.getByText(/PENDING RELEASE/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Outstanding: \$5,000\.00/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Pay with PayPal/i }).length).toBeGreaterThan(0);
  });

  it("does not offer milestone checkout to a non-payer", () => {
    const solverUser = { ...mockUser, id: "usr_alex_02" };
    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={pendingMilestoneTx}
        business={mockBusiness}
        currentUser={solverUser}
      />
    );

    expect(
      screen.queryByRole("button", { name: /Pay with PayPal/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Only the designated payer can initiate this milestone payment/i)
    ).toBeInTheDocument();
  });

  it("calls downloadInvoiceFile when clicking Download Invoice button", () => {
    const downloadSpy = vi.spyOn(invoiceGen, "downloadInvoiceFile").mockImplementation(() => {});

    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={completedTx}
        business={mockBusiness}
        currentUser={mockUser}
      />
    );

    const downloadBtns = screen.getAllByRole("button", { name: /Download/i });
    fireEvent.click(downloadBtns[0]);

    expect(downloadSpy).toHaveBeenCalledWith(completedTx, mockBusiness, mockUser);
    downloadSpy.mockRestore();
  });

  it("calls window.print when clicking Print button", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={completedTx}
        business={mockBusiness}
        currentUser={mockUser}
      />
    );

    const printBtn = screen.getByRole("button", { name: /Print/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("initiates PayPal order creation when payer clicks Pay with PayPal on pending milestone invoice", async () => {
    vi.mocked(api.fetchMilestoneSettlementStatus).mockResolvedValue({
      milestone_id: "mil_7c757d229a47",
      room_id: "room_vance_chen",
      status: "APPROVED",
      payment_readiness: "READY_FOR_PAYMENT_REVIEW",
      agreed_amount: "5000.00",
      currency: "USD",
      transaction_id: "tx_101",
      transaction_ref: "TXN-SETTLE-VANCE-001",
      transaction_status: "PENDING",
      is_payer: true,
      payer_user_id: "usr_vance_01",
      payee_user_id: "usr_alex_02",
    });

    vi.mocked(api.createMilestonePayPalOrder).mockResolvedValue({
      transaction_id: "tx_101",
      transaction_ref: "TXN-SETTLE-VANCE-001",
      paypal_order_id: "ORDER-SANDBOX-999",
      order_status: "CREATED",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-SANDBOX-999",
      currency: "USD",
      amount: "5000.00",
    });

    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={pendingMilestoneTx}
        business={mockBusiness}
        currentUser={mockUser}
      />
    );

    const payBtn = screen.getAllByRole("button", { name: /Pay with PayPal/i })[0];
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(api.createMilestonePayPalOrder).toHaveBeenCalledWith(
        "room_vance_chen",
        "mil_7c757d229a47",
        expect.stringMatching(/^ord_mil_7c757d229a47_/),
        expect.stringContaining("payment=return"),
        expect.stringContaining("payment=cancelled")
      );
    });
    expect(api.fetchMilestoneSettlementStatus).toHaveBeenCalledWith(
      "room_vance_chen",
      "mil_7c757d229a47"
    );
  });

  it("does not create an order if authoritative settlement status names a different payer", async () => {
    vi.mocked(api.fetchMilestoneSettlementStatus).mockResolvedValue({
      milestone_id: "mil_7c757d229a47",
      room_id: "room_vance_chen",
      status: "APPROVED",
      payment_readiness: "READY_FOR_PAYMENT_REVIEW",
      agreed_amount: "5000.00",
      currency: "USD",
      transaction_id: "tx_101",
      transaction_ref: "TXN-SETTLE-VANCE-001",
      transaction_status: "PENDING",
      is_payer: false,
      payer_user_id: "usr_vance_01",
      payee_user_id: "usr_alex_02",
    });

    const unassignedTx = { ...pendingMilestoneTx, payer_user_id: null };
    const solverUser = { ...mockUser, id: "usr_alex_02" };
    render(
      <InvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        transaction={unassignedTx}
        business={mockBusiness}
        currentUser={solverUser}
      />
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /Pay with PayPal/i })[0]
    );

    expect(
      await screen.findByText(/Only the designated payer can initiate this milestone payment/i)
    ).toBeInTheDocument();
    expect(api.prepareMilestoneSettlement).not.toHaveBeenCalled();
    expect(api.createMilestonePayPalOrder).not.toHaveBeenCalled();
  });
});
