"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle,
  Target,
  Lightbulb,
} from "lucide-react";
import { User } from "@/types";
import { loginUser, registerUser } from "@/lib/api";

export type RoleSelection = "seeker" | "creator";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [selectedRole, setSelectedRole] = useState<RoleSelection>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("opnly_active_role");
      if (saved === "creator" || saved === "seeker") return saved;
    }
    return "seeker";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please provide both email and password.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("opnly_active_role", selectedRole);
        window.dispatchEvent(new Event("opnly:role_changed"));
      }

      if (mode === "login") {
        const response = await loginUser({
          email: email.trim(),
          password,
        });
        setSuccessMessage("Signed in successfully!");
        setTimeout(() => {
          onSuccess(response.user);
          onClose();
        }, 300);
      } else {
        const response = await registerUser({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        });
        setSuccessMessage("Account created successfully!");
        setTimeout(() => {
          onSuccess(response.user);
          onClose();
        }, 300);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("owner@apexgearworks.demo");
    setPassword("Password123!");
    setMode("login");
    setErrorMessage(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 sm:p-8">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-slate-900">
              {mode === "login" ? "Sign In to Opnly" : "Create Your Account"}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === "login"
                ? "Access your opportunities and business workspace"
                : "Join the Idea-to-Business Opportunity Network"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" className="mb-6 flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In Tab
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => {
              setMode("register");
              setErrorMessage(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account Tab
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="mb-4 flex items-start space-x-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center space-x-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Role-Based Landing Choice: Blue for Seeker vs. Green for Creator */}
        <div className="mb-5 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Choose Your Primary Intent & Theme:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Blue: Seek Solutions */}
            <button
              type="button"
              onClick={() => setSelectedRole("seeker")}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedRole === "seeker"
                  ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500 text-blue-950 shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Target className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-extrabold text-blue-900 leading-none">
                    Seek Solutions
                  </span>
                </div>
                <p className="text-[10px] text-blue-700 font-medium leading-tight">
                  I need something... (Post requests & find talent)
                </p>
              </div>
              <span className="mt-2 inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 w-fit">
                Blue Mode
              </span>
            </button>

            {/* Green: Share Skills & Ideas */}
            <button
              type="button"
              onClick={() => setSelectedRole("creator")}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedRole === "creator"
                  ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500 text-emerald-950 shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Lightbulb className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-extrabold text-emerald-900 leading-none">
                    Share Skills
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 font-medium leading-tight">
                  I can offer... (Create opportunities & ideas)
                </p>
              </div>
              <span className="mt-2 inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 w-fit">
                Green Mode
              </span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-fullname"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Full Name (Optional)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`flex w-full items-center justify-center space-x-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:opacity-50 ${
              selectedRole === "seeker"
                ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
                : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
              </>
            ) : (
              <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
            )}
          </button>
        </form>

        {/* Demo Account Quick-Fill */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500 mb-2">Testing or evaluating Opnly?</p>
          <button
            type="button"
            onClick={handleFillDemo}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Use Demo Account (Apex Owner)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
