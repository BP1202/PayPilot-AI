import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BusinessOnboardingModal } from "@/components/BusinessOnboardingModal";
import * as api from "@/lib/api";
import { Business, BusinessProfileExtraction } from "@/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    extractBusinessProfile: vi.fn(),
    createBusinessProfile: vi.fn(),
  };
});

describe("BusinessOnboardingModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <BusinessOnboardingModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    expect(screen.queryByText("Create Business Profile")).not.toBeInTheDocument();
  });

  it("renders input step when open and allows typing business description", () => {
    render(
      <BusinessOnboardingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Create Business Profile")).toBeInTheDocument();
    expect(screen.getByLabelText(/Describe Your Business/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Auto-fill with AI/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fill Manually/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sample description/i })).not.toBeInTheDocument();
    expect((screen.getByLabelText(/Describe Your Business/i) as HTMLTextAreaElement).value).toBe("");
  });

  it("extracts suggestions via AI, populates editable form, and keeps missing website blank", async () => {
    const mockExtraction: BusinessProfileExtraction = {
      name: "ABC Company",
      description: "ABC Company is an electronics wholesaler based in Ahmedabad, India.",
      industry: "Electronics",
      business_type: "Wholesaler",
      country: "India",
      website: "", // Anti-hallucination: empty if not in description!
      currency: "INR",
      confidence: 0.95,
      extracted_fields: ["name", "industry", "business_type", "country", "currency", "description"],
    };

    vi.mocked(api.extractBusinessProfile).mockResolvedValueOnce(mockExtraction);

    render(
      <BusinessOnboardingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByLabelText(/Describe Your Business/i);
    fireEvent.change(textarea, {
      target: {
        value:
          "ABC Company is an electronics wholesaler based in Ahmedabad, India. We sell electronic components to retailers.",
      },
    });

    const aiButton = screen.getByRole("button", { name: /Auto-fill with AI/i });
    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(api.extractBusinessProfile).toHaveBeenCalledWith(
        "ABC Company is an electronics wholesaler based in Ahmedabad, India. We sell electronic components to retailers."
      );
    });

    // Check that review step is rendered
    expect(screen.getByText(/Review and edit your profile/i)).toBeInTheDocument();

    // Verify fields populated
    const nameInput = screen.getByLabelText(/Business Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("ABC Company");

    const industryInput = screen.getByLabelText(/Industry/i) as HTMLInputElement;
    expect(industryInput.value).toBe("Electronics");

    const typeInput = screen.getByLabelText(/Business Type/i) as HTMLInputElement;
    expect(typeInput.value).toBe("Wholesaler");

    const countryInput = screen.getByLabelText(/Country/i) as HTMLInputElement;
    expect(countryInput.value).toBe("India");

    const currencySelect = screen.getByLabelText(/Default Currency/i) as HTMLSelectElement;
    expect(currencySelect.value).toBe("INR");

    // Anti-hallucination check: website was not in prompt, must be blank
    const websiteInput = screen.getByLabelText(/Website/i) as HTMLInputElement;
    expect(websiteInput.value).toBe("");
  });

  it("allows user to edit AI suggestions before confirming and saving to DB", async () => {
    const mockExtraction: BusinessProfileExtraction = {
      name: "ABC Company",
      description: "Electronics wholesale",
      industry: "Electronics",
      business_type: "Wholesaler",
      country: "India",
      website: "",
      currency: "INR",
      confidence: 0.95,
      extracted_fields: ["name", "industry", "business_type", "country", "currency"],
    };

    const mockSavedBusiness: Business = {
      id: 42,
      name: "ABC Electronics Ltd",
      currency: "INR",
      industry: "Electronics",
      business_type: "Wholesaler & Exporter",
      country: "India",
      website: "https://abcelectronics.in",
      description: "Electronics wholesale",
      user_id: "owner_default",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(api.extractBusinessProfile).mockResolvedValueOnce(mockExtraction);
    vi.mocked(api.createBusinessProfile).mockResolvedValueOnce(mockSavedBusiness);

    render(
      <BusinessOnboardingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByLabelText(/Describe Your Business/i);
    fireEvent.change(textarea, { target: { value: "ABC Company wholesale" } });
    fireEvent.click(screen.getByRole("button", { name: /Auto-fill with AI/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument();
    });

    // Edit business name
    const nameInput = screen.getByLabelText(/Business Name/i);
    fireEvent.change(nameInput, { target: { value: "ABC Electronics Ltd" } });

    // Edit business type
    const typeInput = screen.getByLabelText(/Business Type/i);
    fireEvent.change(typeInput, { target: { value: "Wholesaler & Exporter" } });

    // Add website
    const websiteInput = screen.getByLabelText(/Website/i);
    fireEvent.change(websiteInput, { target: { value: "https://abcelectronics.in" } });

    // Submit form
    const saveButton = screen.getByRole("button", { name: /Save Business Profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.createBusinessProfile).toHaveBeenCalledWith({
        name: "ABC Electronics Ltd",
        currency: "INR",
        industry: "Electronics",
        business_type: "Wholesaler & Exporter",
        country: "India",
        website: "https://abcelectronics.in",
        description: "Electronics wholesale",
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockSavedBusiness);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("supports manual completion without using AI", () => {
    render(
      <BusinessOnboardingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const manualButton = screen.getByRole("button", { name: /Fill Manually/i });
    fireEvent.click(manualButton);

    // Direct transition to empty review form
    expect(screen.getByText(/Review and edit your profile/i)).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Business Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });

  it("handles AI extraction error with a friendly non-technical message", async () => {
    vi.mocked(api.extractBusinessProfile).mockRejectedValueOnce(
      new Error("We couldn't analyze the business description right now. Please enter the details manually.")
    );

    render(
      <BusinessOnboardingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByLabelText(/Describe Your Business/i);
    fireEvent.change(textarea, { target: { value: "Something failed" } });
    fireEvent.click(screen.getByRole("button", { name: /Auto-fill with AI/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "We couldn't analyze the business description right now. Please enter the details manually."
        )
      ).toBeInTheDocument();
    });
  });
});
