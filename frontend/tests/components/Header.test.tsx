import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "@/components/Header";
import { Business } from "@/types";

describe("Header Component", () => {
  it("renders brand name and demo indicators", () => {
    const business: Business = {
      id: 1,
      name: "Apex Precision Gearworks",
      currency: "USD",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<Header business={business} />);
    expect(screen.getByText("PayPilot AI")).toBeInTheDocument();
    expect(screen.getByText("Apex Precision Gearworks")).toBeInTheDocument();
    expect(screen.getByText("PayPal Simulated Sandbox")).toBeInTheDocument();
  });
});

