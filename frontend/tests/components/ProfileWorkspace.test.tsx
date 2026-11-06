import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import * as api from "@/lib/api";
import { User, ProfileMeResponse } from "@/types";

describe("ProfileWorkspace Component", () => {
  const mockUser: User = {
    id: "user_test_123",
    email: "sarah@example.com",
    full_name: "Sarah Architect",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockProfilesData: ProfileMeResponse = {
    individual: {
      user_id: "user_test_123",
      headline: "Staff Cloud Engineer",
      bio: "Building resilient microservices.",
      location: "San Jose, CA",
      industry: "TECH",
      skills: ["Go", "Kubernetes", "PostgreSQL"],
      experience: [],
      services: [],
      resources: [],
      interests: ["Fintech", "Distributed Systems"],
      visibility: "AUTHENTICATED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completeness_percent: 83,
      missing_fields: ["bio"],
    },
    businesses: [
      {
        id: 101,
        name: "Apex Precision Gearworks",
        currency: "USD",
        industry: "Precision Machining",
        business_type: "Manufacturer",
        country: "United States",
        location: "Austin, TX",
        website: "https://apexgearworks.demo",
        description: "Specialized CNC precision gearing.",
        user_id: "user_test_123",
        visibility: "PRIVATE",
        skills: ["CNC Milling", "Gearing"],
        experience: [],
        services: ["Prototyping"],
        resources: ["5-Axis CNC Mill"],
        interests: ["Robotics"],
        completeness_percent: 100,
        missing_fields: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders sign in prompt when user is unauthenticated", () => {
    const onOpenAuth = vi.fn();
    render(<ProfileWorkspace currentUser={null} onOpenAuth={onOpenAuth} />);

    expect(
      screen.getByText("Sign In to Access Your Profiles")
    ).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Sign In \/ Register/i });
    fireEvent.click(btn);
    expect(onOpenAuth).toHaveBeenCalled();
  });

  it("fetches and renders individual profile details and completeness meter", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);

    render(<ProfileWorkspace currentUser={mockUser} />);

    // Shows loading then resolves
    await waitFor(() => {
      expect(screen.getByDisplayValue("Staff Cloud Engineer")).toBeInTheDocument();
    });

    expect(screen.getByText("83%")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Fintech")).toBeInTheDocument();
  });

  it("allows switching to Organization Profile tab and displays entity details", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);

    render(<ProfileWorkspace currentUser={mockUser} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Staff Cloud Engineer")).toBeInTheDocument();
    });

    // Click Organization Profile tab
    const orgTab = screen.getByRole("button", { name: /Organization Profile/i });
    fireEvent.click(orgTab);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Apex Precision Gearworks")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Manufacturer")).toBeInTheDocument();
    });

    expect(screen.getByText("CNC Milling")).toBeInTheDocument();
    expect(screen.getByText("Robotics")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("saves updated individual profile with feedback banner", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);
    const updateSpy = vi
      .spyOn(api, "updateMyIndividualProfile")
      .mockResolvedValue({
        ...mockProfilesData.individual,
        headline: "Principal Systems Architect",
        completeness_percent: 100,
        missing_fields: [],
      });

    render(<ProfileWorkspace currentUser={mockUser} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Staff Cloud Engineer")).toBeInTheDocument();
    });

    const headlineInput = screen.getByDisplayValue("Staff Cloud Engineer");
    fireEvent.change(headlineInput, {
      target: { value: "Principal Systems Architect" },
    });

    const saveBtn = screen.getByRole("button", {
      name: /Save Individual Profile/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: "Principal Systems Architect",
        })
      );
      expect(
        screen.getByText("Individual profile updated successfully!")
      ).toBeInTheDocument();
    });
  });
});
