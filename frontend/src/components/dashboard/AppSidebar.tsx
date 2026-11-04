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
} from "lucide-react";
import { User, Business } from "@/types";

export type DashboardView =
  | "home"
  | "opportunities"
  | "browse"
  | "ledger"
  | "profile";

interface AppSidebarProps {
  currentView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  currentUser?: User | null;
  business?: Business | null;
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
  onOpenProfile,
  onOpenAuth,
  onSignOut,
  onCreateOpportunity,
}) => {
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

  const navItems: Array<{
    id: DashboardView;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "opportunities", label: "My Opportunities", icon: Lightbulb },
    { id: "browse", label: "Browse Opportunities", icon: Compass },
    { id: "profile", label: "Profiles", icon: Building2 },
    { id: "ledger", label: "Commerce Ledger", icon: Receipt },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-slate-200/80 bg-white min-h-screen p-4 select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-100">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                PayPilot AI
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 tracking-tight">
              Connect · Collaborate · Grow
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={onOpenProfile}
            className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span>Business Profile</span>
            </div>
          </button>

          <div className="pt-2 border-t border-slate-100 my-2" />

          {/* Messages & Secondary Links */}
          <div className="space-y-1">
            <button
              onClick={() => onNavigate("browse")}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span>Messages</span>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                2
              </span>
            </button>

            <button
              onClick={() => onNavigate("browse")}
              className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => onNavigate("browse")}
              className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span>Help & Support</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="space-y-4 pt-4">
        {/* Turn Ideas into Impact Promo Card */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs mb-2">
            <Sparkles className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Turn Ideas Into Impact</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Together, we build a stronger, more innovative community.
          </p>
          <button
            onClick={() => onNavigate("opportunities")}
            className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-indigo-600 py-1.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <span>Explore Opportunities</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* User Identity / Auth Box */}
        {currentUser ? (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {getInitials(currentUser.full_name, currentUser.email)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser.full_name || currentUser.email.split("@")[0]}
                </p>
                <p className="text-[10px] font-semibold text-indigo-600">
                  Pro Member
                </p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
          >
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};

