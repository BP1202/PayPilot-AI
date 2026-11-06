"use client";

import React from "react";
import {
  Rocket,
  Home as HomeIcon,
  Lightbulb,
  Compass,
  Building2,
  Receipt,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Handshake,
  Briefcase,
  Search,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { User, Business } from "@/types";

export type DashboardView =
  | "home"
  | "opportunities"
  | "browse"
  | "collaborations"
  | "deal-rooms"
  | "ledger"
  | "profile";

export type UserRole = "seeker" | "creator";

interface AppSidebarProps {
  currentView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  currentUser?: User | null;
  business?: Business | null;
  activeRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onCreateOpportunity?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  business,
  activeRole = "seeker",
  onRoleChange,
  onOpenProfile,
  onOpenAuth,
  onSignOut,
  onCreateOpportunity,
}) => {
  const isSeeker = activeRole === "seeker";

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "JD";
  };

  // Role-tailored navigation items (fewer items, clearer labels)
  const navItems: Array<{
    id: DashboardView;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }> = isSeeker
    ? [
        { id: "home", label: "Dashboard", icon: HomeIcon },
        { id: "opportunities", label: "Opportunities", icon: Compass },
        { id: "collaborations", label: "My Applications & Proposals", icon: Handshake },
        { id: "deal-rooms", label: "Active Workspaces", icon: Briefcase },
        { id: "ledger", label: "Payments & Earnings", icon: Receipt },
      ]
    : [
        { id: "home", label: "Dashboard", icon: HomeIcon },
        { id: "opportunities", label: "Opportunities", icon: Lightbulb },
        { id: "collaborations", label: "Review Proposals", icon: Handshake },
        { id: "deal-rooms", label: "Deal Rooms", icon: Briefcase },
        { id: "ledger", label: "Payments & Earnings", icon: Receipt },
      ];

  return (
    <aside className="w-64 h-full shrink-0 flex flex-col justify-between border-r border-slate-200/80 bg-white p-4 select-none overflow-y-auto">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-100">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                Opnly
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 tracking-tight">
              Where Ideas Find the Right People
            </p>
          </div>
        </div>

        {/* Role Switcher Pill: Blue for Seeker vs. Green for Share Skills */}
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            <span>Active Role</span>
            <span
              className={
                isSeeker
                  ? "text-blue-600 font-extrabold"
                  : "text-emerald-600 font-extrabold"
              }
            >
              {isSeeker ? "Seeking Solutions" : "Sharing Skills"}
            </span>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => onRoleChange?.("seeker")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isSeeker
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              aria-pressed={isSeeker}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Seeker</span>
            </button>
            <button
              type="button"
              onClick={() => onRoleChange?.("creator")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                !isSeeker
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              aria-pressed={!isSeeker}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Creator</span>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" className="space-y-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id || (item.id === "opportunities" && currentView === "browse");
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? isSeeker
                      ? "bg-blue-600 text-white shadow-xs shadow-blue-200"
                      : "bg-emerald-600 text-white shadow-xs shadow-emerald-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 pt-4">
        {/* User Identity Box with Clear Active Role Indicator */}
        {currentUser ? (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 flex items-center justify-between">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition cursor-pointer flex-1"
              title="View Profile"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ${
                  isSeeker
                    ? "bg-gradient-to-tr from-blue-600 to-indigo-600 ring-2 ring-blue-100"
                    : "bg-gradient-to-tr from-emerald-600 to-teal-600 ring-2 ring-emerald-100"
                }`}
              >
                {getInitials(currentUser.full_name, currentUser.email)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser.full_name || currentUser.email.split("@")[0]}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-extrabold border ${
                      isSeeker
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {isSeeker ? "Seeker · Solutions" : "Creator · Skills"}
                  </span>
                </div>
              </div>
            </button>
            <button
              onClick={onSignOut}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-semibold">
              <span>Current Mode:</span>
              <span
                className={`font-bold ${
                  isSeeker ? "text-blue-600" : "text-emerald-600"
                }`}
              >
                {isSeeker ? "Seeker Workspace" : "Creator Workspace"}
              </span>
            </div>
            <button
              onClick={onOpenAuth}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer ${
                isSeeker ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
