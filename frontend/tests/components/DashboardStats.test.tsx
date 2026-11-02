import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardTotals } from "@/types";

describe("DashboardStats Component", () => {
  it("renders verified totals formatted as currency", () => {
    const totals: DashboardTotals = {
      business_id: 1,
      currency: "USD",
      total_revenue: "10135.75",
      completed_count: 4,
      pending_count: 1,
      pending_total: "2650.00",
      transaction_count: 5,
    };

    render(<DashboardStats totals={totals} />);
    expect(screen.getByText("$10,135.75")).toBeInTheDocument();
    expect(screen.getByText("$2,650.00")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
