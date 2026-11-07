import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthModal } from "@/components/AuthModal";
import * as api from "@/lib/api";

describe("AuthModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <AuthModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders sign in form by default when open", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByRole("heading", { name: /sign in to opnly/i })).toBeDefined();
    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /use demo account/i })).toBeDefined();
  });

  it("switches to registration mode and displays full name field", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const createTab = screen.getByRole("tab", { name: /create account/i });
    fireEvent.click(createTab);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeDefined();
    expect(screen.getByLabelText(/full name/i)).toBeDefined();
  });

  it("fills demo credentials when clicking demo account button", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const demoBtn = screen.getByRole("button", { name: /use demo account/i });
    fireEvent.click(demoBtn);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    expect(emailInput.value).toBe("owner@apexgearworks.demo");
    expect(passwordInput.value).toBe("Password123!");
  });

  it("calls loginUser on valid sign in submission", async () => {
    const mockUser = {
      id: "usr_123",
      email: "owner@apexgearworks.demo",
      full_name: "Apex Owner",
      is_active: true,
      created_at: "2026-11-04T00:00:00Z",
      updated_at: "2026-11-04T00:00:00Z",
    };

    vi.spyOn(api, "loginUser").mockResolvedValueOnce({
      access_token: "jwt_token_123",
      token_type: "bearer",
      expires_in: 86400,
      user: mockUser,
    });

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: /use demo account/i }));
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({
        email: "owner@apexgearworks.demo",
        password: "Password123!",
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it("calls registerUser on valid registration submission", async () => {
    const mockUser = {
      id: "usr_456",
      email: "new_creator@paypilot.demo",
      full_name: "New Creator",
      is_active: true,
      created_at: "2026-11-04T00:00:00Z",
      updated_at: "2026-11-04T00:00:00Z",
    };

    vi.spyOn(api, "registerUser").mockResolvedValueOnce({
      access_token: "jwt_token_456",
      token_type: "bearer",
      expires_in: 86400,
      user: mockUser,
    });

    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialMode="register"
      />
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new_creator@paypilot.demo" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "SecurePassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "New Creator" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(api.registerUser).toHaveBeenCalledWith({
        email: "new_creator@paypilot.demo",
        password: "SecurePassword123!",
        full_name: "New Creator",
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it("allows selecting starting workspace (Seeker vs Contributor) with dual-participation notice and saves choice", async () => {
    const mockUser = {
      id: "usr_789",
      email: "creator@opnly.demo",
      full_name: "Opnly Creator",
      is_active: true,
      created_at: "2026-11-04T00:00:00Z",
      updated_at: "2026-11-04T00:00:00Z",
    };

    vi.spyOn(api, "loginUser").mockResolvedValueOnce({
      access_token: "jwt_token_789",
      token_type: "bearer",
      expires_in: 86400,
      user: mockUser,
    });

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Verify dual-path notice is rendered
    expect(screen.getByText(/One account supports both paths/i)).toBeInTheDocument();

    // Verify both workspace choice cards are rendered
    expect(screen.getByText("I need a solution")).toBeInTheDocument();
    expect(screen.getByText("I have skills to offer")).toBeInTheDocument();
    expect(screen.getByText("Seeker Workspace")).toBeInTheDocument();
    expect(screen.getByText("Contributor Workspace")).toBeInTheDocument();

    // Select Contributor Workspace
    fireEvent.click(screen.getByText("I have skills to offer"));

    // Fill credentials and submit
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "creator@opnly.demo" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(localStorage.getItem("opnly_active_role")).toBe("creator");
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });
});
