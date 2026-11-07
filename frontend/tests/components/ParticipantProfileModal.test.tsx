import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ParticipantProfileModal } from "@/components/profile/ParticipantProfileModal";
import * as api from "@/lib/api";
import { IndividualProfile, Business } from "@/types";

describe("ParticipantProfileModal Component", () => {
  const mockIndividual: IndividualProfile = {
    user_id: "user_contributor_123",
    headline: "Senior Cloud & AI Architect",
    bio: "Passionate about decentralized systems and high-throughput data pipelines.",
    location: "Berlin, Germany",
    industry: "FINTECH",
    skills: ["Python", "FastAPI", "Kubernetes", "PyTorch"],
    services: ["MLOps Pipeline Setup", "Fintech Compliance Review"],
    resources: ["GPU Compute Cluster", "SOC-2 Sandbox"],
    experience: ["Ex-Revolut Tech Lead", "Open-source Maintainer"],
    interests: ["Algorithmic Trading", "Decentralized Networks"],
    visibility: "PUBLIC",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockBusiness: Business = {
    id: 202,
    name: "Nordic Dynamics Robotics Corp",
    currency: "EUR",
    industry: "Industrial Automation",
    business_type: "OEM Hardware & Robotics Manufacturer",
    country: "Sweden",
    location: "Stockholm",
    website: "https://nordicdynamics.example",
    description: "Engineering autonomous mobile robots and specialized warehouse fulfillment systems.",
    user_id: "user_owner_456",
    visibility: "AUTHENTICATED",
    skills: ["Precision Mechatronics", "Embedded C++", "ROS2"],
    services: ["Custom AMR Manufacturing", "Automated Fleet Integration"],
    resources: ["Robotics Assembly Line", "HIL Simulation Rig"],
    experience: ["15+ Years Industrial Robotics", "ISO-13849 Certified"],
    interests: ["Computer Vision", "Fleet Telemetry"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ParticipantProfileModal
        isOpen={false}
        onClose={vi.fn()}
        participantId="user_contributor_123"
        participantType="INDIVIDUAL"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("fetches and renders public individual profile with multi-dimensional capabilities", async () => {
    vi.spyOn(api, "fetchPublicIndividualProfile").mockResolvedValue(mockIndividual);
    const onClose = vi.fn();

    render(
      <ParticipantProfileModal
        isOpen={true}
        onClose={onClose}
        participantId="user_contributor_123"
        participantType="INDIVIDUAL"
      />
    );

    // Shows loading then displays loaded profile
    await waitFor(() => {
      expect(screen.getByText("Senior Cloud & AI Architect")).toBeInTheDocument();
    });

    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
    expect(screen.getByText("FINTECH")).toBeInTheDocument();
    expect(screen.getByText("PUBLIC")).toBeInTheDocument();
    expect(
      screen.getByText(/Passionate about decentralized systems/i)
    ).toBeInTheDocument();

    // Verify all capability tags
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("MLOps Pipeline Setup")).toBeInTheDocument();
    expect(screen.getByText("GPU Compute Cluster")).toBeInTheDocument();
    expect(screen.getByText("Ex-Revolut Tech Lead")).toBeInTheDocument();
    expect(screen.getByText("Algorithmic Trading")).toBeInTheDocument();

    // Close button triggers onClose
    const closeBtn = screen.getByRole("button", { name: /Close profile modal/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("fetches and renders public business profile with website and capabilities", async () => {
    vi.spyOn(api, "fetchPublicBusinessProfile").mockResolvedValue(mockBusiness);

    render(
      <ParticipantProfileModal
        isOpen={true}
        onClose={vi.fn()}
        participantId={202}
        participantType="BUSINESS"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Nordic Dynamics Robotics Corp")).toBeInTheDocument();
    });

    expect(
      screen.getByText("OEM Hardware & Robotics Manufacturer")
    ).toBeInTheDocument();
    expect(screen.getByText("Stockholm, Sweden")).toBeInTheDocument();
    expect(screen.getByText("AUTHENTICATED")).toBeInTheDocument();
    expect(screen.getByText("Precision Mechatronics")).toBeInTheDocument();
    expect(screen.getByText("Custom AMR Manufacturing")).toBeInTheDocument();
    expect(screen.getByText("Robotics Assembly Line")).toBeInTheDocument();
    expect(screen.getByText("15+ Years Industrial Robotics")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Website/i })).toHaveAttribute(
      "href",
      "https://nordicdynamics.example"
    );
  });

  it("handles privacy 403 rejection gracefully with guided notice", async () => {
    vi.spyOn(api, "fetchPublicIndividualProfile").mockRejectedValue(
      new Error("This profile is private.")
    );

    render(
      <ParticipantProfileModal
        isOpen={true}
        onClose={vi.fn()}
        participantId="private_user_789"
        participantType="INDIVIDUAL"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Profile Unavailable")).toBeInTheDocument();
      expect(screen.getByText("This profile is private.")).toBeInTheDocument();
    });
  });

  it("handles unauthenticated 401 rejection gracefully with authentication notice", async () => {
    vi.spyOn(api, "fetchPublicIndividualProfile").mockRejectedValue(
      new Error("Authentication required to view this profile.")
    );

    render(
      <ParticipantProfileModal
        isOpen={true}
        onClose={vi.fn()}
        participantId="auth_only_user_999"
        participantType="INDIVIDUAL"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Profile Unavailable")).toBeInTheDocument();
      expect(
        screen.getByText("Authentication required to view this profile.")
      ).toBeInTheDocument();
    });
  });
});
