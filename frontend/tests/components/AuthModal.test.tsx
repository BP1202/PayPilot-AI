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
    expect(screen.queryByRole("button", { name: /demo account|solver account/i })).not.toBeInTheDocument();
  });

  it("switches to registration mode and displays full name field", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const createTab = screen.getByRole("tab", { name: /create account/i });
    fireEvent.click(createTab);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeDefined();
    expect(screen.getByLabelText(/full name/i)).toBeDefined();
  });

  it("never renders demo credential quick-fill controls", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.queryByRole("button", { name: /demo account|solver account/i })).not.toBeInTheDocument();
  });

  it("calls loginUser on valid sign in submission", async () => {
    const mockUser = {
      id: "usr_123",
      email: "seeker1@opnly.com",
      full_name: "Marcus Vance",
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

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "seeker1@opnly.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({
        email: "seeker1@opnly.com",
        password: "Password123!",
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
    expect(localStorage.getItem("opnly_active_role")).toBeNull();
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

  it("explains unified account participation without requiring a workspace choice", async () => {
    const mockUser = {
      id: "usr_789",
      email: "creator@opnly.demo",
      full_name: "Opnly Creator",
      is_active: true,
      created_at: "2026-11-04T00:00:00Z",
      updated_at: "2026-11-04T00:00:00Z",
    };

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(
      screen.getByText(
        "Opnly gives you one unified account to both request solutions and offer your capabilities across the network."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Seeker Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Contributor Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Initial workspace focus:")).not.toBeInTheDocument();
  });
});
