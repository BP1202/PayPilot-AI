"use client";

import React from "react";
import {
  Rocket,
  Home as HomeIcon,
  Lightbulb,
  Compass,
  Building2,
  Receipt,
  Settings,
  Sparkles,
  Handshake,
  Briefcase,
  User as UserIcon,
  LogOut,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { User, Business } from "@/types";

export type DashboardView =
  | "home"
  | "opportunities"
  | "explore"
  | "browse"
  | "my-opportunities"
  | "matches"
  | "collaborations"
  | "deal-rooms"
  | "ledger"
  | "trust"
  | "profile"
  | "organisations"
  | "settings";

export type UserRole = "seeker" | "creator";

export interface AppSidebarProps {
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
  myOppsCount?: number;
  pendingProposalsCount?: number;
  activeDealRoomsCount?: number;
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
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
  myOppsCount,
  pendingProposalsCount,
  activeDealRoomsCount,
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

  const navGroups: NavGroup[] = [
    {
      title: "Workspace",
      items: [
        { id: "home", label: "Dashboard", icon: HomeIcon },
        {
          id: "opportunities",
          label: "Opportunities",
          icon: Lightbulb,
          badge: myOppsCount && myOppsCount > 0 ? myOppsCount : undefined,
        },
        {
          id: "collaborations",
          label: "Connections & Proposals",
          icon: Handshake,
          badge: pendingProposalsCount && pendingProposalsCount > 0 ? pendingProposalsCount : undefined,
        },
        {
          id: "deal-rooms",
          label: "Deal Rooms",
          icon: Briefcase,
          badge: activeDealRoomsCount && activeDealRoomsCount > 0 ? activeDealRoomsCount : undefined,
        },
        { id: "ledger", label: "Payments & Earnings", icon: Receipt },
      ],
    },
    {
      title: "Network & Discovery",
      items: [
        { id: "explore", label: "Discover Network", icon: Compass },
        { id: "matches", label: "AI Matchmaking", icon: Sparkles },
        { id: "trust", label: "Trust & Reputation", icon: ShieldCheck },
      ],
    },
    {
      title: "Identity & Profiles",
      items: [
        { id: "profile", label: "Personal Profile", icon: UserIcon },
        { id: "organisations", label: "My Organisations", icon: Building2 },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 h-full shrink-0 flex flex-col justify-between border-r border-slate-200/80 bg-white p-4 select-none overflow-y-auto">
      <div className="space-y-4">
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

        {/* Primary Action Button: + Create Opportunity */}
        <div className="px-1 pt-1">
          <button
            type="button"
            onClick={() => onCreateOpportunity?.()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 py-2.5 px-3 text-xs font-extrabold text-white shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 transition cursor-pointer active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Create Opportunity</span>
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav aria-label="Main Navigation" className="space-y-4 pt-1">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentView === item.id ||
                    (item.id === "opportunities" &&
                      (currentView === "browse" || currentView === "my-opportunities")) ||
                    (item.id === "explore" && currentView === "browse");
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-white" : "text-slate-500"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
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
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        {/* User Identity Box */}
        {currentUser ? (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 flex items-center justify-between">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition cursor-pointer flex-1"
              title="View Profile"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs bg-gradient-to-tr from-indigo-600 to-violet-600 ring-2 ring-indigo-100">
                {getInitials(currentUser.full_name, currentUser.email)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser.full_name || currentUser.email.split("@")[0]}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Unified Account
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
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer bg-indigo-600 hover:bg-indigo-700"
            >
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
