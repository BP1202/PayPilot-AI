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
      services: ["Cloud Architecture", "API Modernization"],
      resources: ["AWS GovCloud", "Distributed Testbed"],
      experience: ["10+ Years Cloud Infrastructure", "Fintech Lead"],
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
        services: ["Prototyping", "Turnkey Machining"],
        resources: ["5-Axis CNC Mill", "ISO-9001 Facility"],
        experience: ["20+ Years Aerospace Machining"],
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

  it("fetches and renders individual profile details, capability dimensions, and completeness meter", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);

    render(<ProfileWorkspace currentUser={mockUser} />);

    // Shows loading then resolves
    await waitFor(() => {
      expect(screen.getByDisplayValue("Staff Cloud Engineer")).toBeInTheDocument();
    });

    expect(screen.getByText("83%")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Cloud Architecture")).toBeInTheDocument();
    expect(screen.getByText("AWS GovCloud")).toBeInTheDocument();
    expect(screen.getByText("10+ Years Cloud Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Fintech")).toBeInTheDocument();
  });

  it("defaults to Individual Profile tab in the unified account", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);

    render(<ProfileWorkspace currentUser={mockUser} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Staff Cloud Engineer")).toBeInTheDocument();
    });

    // Individual tab remains active by default
    expect(screen.getByRole("button", { name: /^Individual Profile$/i })).toHaveClass(
      "text-blue-700"
    );
  });

  it("allows switching to Organization Profile tab and displays entity details and capability tags", async () => {
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
    expect(screen.getByText("Turnkey Machining")).toBeInTheDocument();
    expect(screen.getByText("5-Axis CNC Mill")).toBeInTheDocument();
    expect(screen.getByText("20+ Years Aerospace Machining")).toBeInTheDocument();
    expect(screen.getByText("Robotics")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Register New Organization/i })
    ).toBeInTheDocument();
  });

  it("saves updated individual profile with new capability dimensions (services, resources, experience)", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);
    const updateSpy = vi
      .spyOn(api, "updateMyIndividualProfile")
      .mockResolvedValue({
        ...mockProfilesData.individual,
        headline: "Principal Systems Architect",
        services: ["Cloud Architecture", "API Modernization", "Distributed Systems Auditing"],
        resources: ["AWS GovCloud", "Distributed Testbed", "Specialized Security Rig"],
        experience: ["10+ Years Cloud Infrastructure", "Fintech Lead", "AWS Fellow"],
        completeness_percent: 100,
        missing_fields: [],
      });

    render(<ProfileWorkspace currentUser={mockUser} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Staff Cloud Engineer")).toBeInTheDocument();
    });

    // Add service
    const serviceInput = screen.getByPlaceholderText(/Add a service/i);
    fireEvent.change(serviceInput, { target: { value: "Distributed Systems Auditing" } });
    fireEvent.keyDown(serviceInput, { key: "Enter" });

    // Add resource
    const resourceInput = screen.getByPlaceholderText(/Add a tool or resource/i);
    fireEvent.change(resourceInput, { target: { value: "Specialized Security Rig" } });
    fireEvent.keyDown(resourceInput, { key: "Enter" });

    // Add experience
    const expInput = screen.getByPlaceholderText(/Add an experience highlight/i);
    fireEvent.change(expInput, { target: { value: "AWS Fellow" } });
    fireEvent.keyDown(expInput, { key: "Enter" });

    const saveBtn = screen.getByRole("button", {
      name: /Save Individual Profile/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          services: expect.arrayContaining(["Distributed Systems Auditing"]),
          resources: expect.arrayContaining(["Specialized Security Rig"]),
          experience: expect.arrayContaining(["AWS Fellow"]),
        })
      );
      expect(
        screen.getByText("Individual profile updated successfully!")
      ).toBeInTheDocument();
    });
  });

  it("opens BusinessOnboardingModal when clicking Register New Organization in Organization tab", async () => {
    vi.spyOn(api, "fetchMyProfiles").mockResolvedValue(mockProfilesData);

    render(<ProfileWorkspace currentUser={mockUser} initialTab="organization" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Apex Precision Gearworks")).toBeInTheDocument();
    });

    const registerBtn = screen.getByRole("button", {
      name: /Register New Organization/i,
    });
    fireEvent.click(registerBtn);

    // BusinessOnboardingModal is opened
    await waitFor(() => {
      expect(screen.getByText("Create Business Profile")).toBeInTheDocument();
    });
  });
});
