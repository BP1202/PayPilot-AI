import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CommerceLedger } from "@/components/CommerceLedger";
import { Transaction } from "@/types";

describe("CommerceLedger Component", () => {
  const transactions: Transaction[] = [
    {
      id: 1,
      transaction_ref: "TXN-DEMO-001",
      business_id: 1,
      amount: "4250.00",
      currency: "USD",
      status: "COMPLETED",
      type: "CUSTOMER_PAYMENT",
      payment_method: "PAYPAL_SIMULATED",
      customer_name: "AeroDrive Systems",
      description: "Helical gears",
      created_at: "2026-11-01T12:00:00Z",
      updated_at: "2026-11-01T12:00:00Z",
    },
    {
      id: 2,
      transaction_ref: "TXN-DEMO-005",
      business_id: 1,
      amount: "2650.00",
      currency: "USD",
      status: "PENDING",
      type: "CUSTOMER_PAYMENT",
      payment_method: "PAYPAL_SIMULATED",
      customer_name: "Stratos Dynamics",
      description: "Rush production reducer",
      created_at: "2026-11-01T13:00:00Z",
      updated_at: "2026-11-01T13:00:00Z",
    },
  ];

  it("renders transaction table and filters", () => {
    const onFilterChange = vi.fn();
    render(
      <CommerceLedger
        transactions={transactions}
        onFilterChange={onFilterChange}
      />
    );

    expect(screen.getByText("TXN-DEMO-001")).toBeInTheDocument();
    expect(screen.getByText("AeroDrive Systems")).toBeInTheDocument();
    expect(screen.getByText("TXN-DEMO-005")).toBeInTheDocument();
    expect(screen.getByText("Stratos Dynamics")).toBeInTheDocument();

    const completedBtn = screen.getByRole("button", { name: "Completed" });
    fireEvent.click(completedBtn);
    expect(onFilterChange).toHaveBeenCalledWith("COMPLETED");
  });

  it("renders user-friendly non-technical error state when error is passed", () => {
    render(
      <CommerceLedger
        transactions={[]}
        error="Connection issue"
        onFilterChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(/We couldn't load your transaction history right now/i)
    ).toBeInTheDocument();
  });
});
