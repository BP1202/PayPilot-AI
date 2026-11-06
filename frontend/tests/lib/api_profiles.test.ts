import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchMyProfiles,
  fetchMyIndividualProfile,
  updateMyIndividualProfile,
  updateMyBusinessProfile,
  fetchPublicIndividualProfile,
  fetchPublicBusinessProfile,
  setAccessToken,
  clearAccessToken,
} from "@/lib/api";

describe("Profile System API Client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetchMyProfiles sends JWT in Authorization header", async () => {
    setAccessToken("mock_jwt_token_123");
    const mockData = {
      individual: {
        user_id: "user_1",
        headline: "CTO",
        skills: ["Rust"],
        completeness_percent: 50,
        missing_fields: ["bio", "location", "interests"],
        visibility: "PRIVATE",
        created_at: new Date().toISOString(),
      },
      businesses: [],
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetchMyProfiles();
    expect(result).toEqual(mockData);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/profiles/me"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock_jwt_token_123",
        }),
      })
    );
  });

  it("updateMyIndividualProfile sends PUT with payload and auth headers", async () => {
    setAccessToken("mock_jwt_token_123");
    const updatePayload = {
      headline: "Senior Cloud Architect",
      skills: ["Python", "FastAPI"],
      visibility: "PUBLIC" as const,
    };
    const mockResponse = {
      user_id: "user_1",
      ...updatePayload,
      completeness_percent: 67,
      missing_fields: ["bio", "interests"],
      created_at: new Date().toISOString(),
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await updateMyIndividualProfile(updatePayload);
    expect(result.headline).toBe("Senior Cloud Architect");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/profiles/me/individual"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(updatePayload),
      })
    );
  });

  it("updateMyBusinessProfile sends PUT with businessId in URL", async () => {
    setAccessToken("mock_jwt_token_123");
    const updatePayload = {
      location: "Denver, CO",
      skills: ["Robotics"],
      visibility: "AUTHENTICATED" as const,
    };
    const mockResponse = {
      id: 42,
      name: "Apex Gearworks",
      ...updatePayload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await updateMyBusinessProfile(42, updatePayload);
    expect(result.id).toBe(42);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/profiles/me/businesses/42"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(updatePayload),
      })
    );
  });

  it("fetchPublicIndividualProfile sends GET with encoded target user id", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user_id: "user_abc",
        headline: "Public Consultant",
        visibility: "PUBLIC",
      }),
    } as Response);

    await fetchPublicIndividualProfile("user_abc");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/profiles/individuals/user_abc"),
      expect.any(Object)
    );
  });
});

