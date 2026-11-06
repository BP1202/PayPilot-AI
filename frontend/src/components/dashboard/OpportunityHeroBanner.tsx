"use client";

import React from "react";
import {
  Handshake,
  CheckCircle2,
  Target,
  Rocket,
  Search,
  Briefcase,
  User,
  PlusCircle,
  FileText,
  Layers,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { OpportunityIntent } from "@/types";
import { DashboardView } from "./AppSidebar";

export type UserRole = "seeker" | "creator";

interface OpportunityHeroBannerProps {
  role?: UserRole;
  userName?: string | null;
  onNavigate?: (view: DashboardView) => void;
  onRoleChange?: (role: UserRole) => void;
  onQuickAction?: (intent: OpportunityIntent) => void;
  onCreateOpportunity?: () => void;
}

export const OpportunityHeroBanner: React.FC<OpportunityHeroBannerProps> = ({
  role = "seeker",
  userName,
  onNavigate,
  onRoleChange,
  onQuickAction,
  onCreateOpportunity,
}) => {
  const isSeeker = role === "seeker";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-xs space-y-6 w-full transition-all duration-300 ${
        isSeeker
          ? "border-blue-200/90 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/70"
          : "border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/70"
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Vision & Primary Information */}
        <div className="lg:col-span-7 space-y-3">
          {/* Active Role Badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition ${
              isSeeker
                ? "bg-blue-100/90 text-blue-800 border-blue-200"
                : "bg-emerald-100/90 text-emerald-800 border-emerald-200"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>
              {isSeeker
                ? "Opnly Opportunity Network · Seeker Workspace (Seeking Solutions)"
                : "Opnly Opportunity Network · Creator Workspace (Sharing Skills & Ideas)"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Turn Ideas Into Impact —{" "}
            <span
              className={`bg-clip-text text-transparent bg-gradient-to-r ${
                isSeeker
                  ? "from-blue-600 to-indigo-600"
                  : "from-emerald-600 to-teal-600"
              }`}
            >
              {isSeeker
                ? "Where Business Problems Find Proven Talent"
                : "Where Your Skills & Ideas Find Real Opportunities"}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            {isSeeker
              ? "Discover verified commercial initiatives, submit structured milestone proposals, and get paid for verified outcomes in secure AI Deal Rooms."
              : "Publish your capabilities and business problems, evaluate candidate proposals, and coordinate verified milestone execution in structured AI Deal Rooms."}
          </p>

          {/* Action-First Controls */}
          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Action-First Controls
            </p>
            {isSeeker ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.("browse")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Find Opportunities</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("browse")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  <span>Apply Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("deal-rooms")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                  <span>Track Progress</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("profile")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>Build Profile</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onCreateOpportunity) onCreateOpportunity();
                    else onQuickAction?.("OFFERING_SOLUTION");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Capture Opportunity</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("collaborations")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Review Proposals</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("browse")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Discover Talent</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("opportunities")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  <span>Manage Listings</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Intent CTAs (Blue for Seeker / Green for Creator) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs">
            <span className="font-semibold text-slate-500">Quick actions:</span>
            <button
              type="button"
              onClick={() => {
                onRoleChange?.("seeker");
                onQuickAction?.("SEEKING_SOLUTION");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Target className="h-3.5 w-3.5" />
              <span>Post a Request</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onRoleChange?.("creator");
                onQuickAction?.("OFFERING_SOLUTION");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create Opportunity</span>
            </button>
          </div>
        </div>

        {/* Right Column: Two Color-Coded Role Choice Cards & Capabilities */}
        <div className="lg:col-span-5 lg:border-l lg:pl-6 space-y-4 border-slate-200/80">
          {/* Two Interactive Onboarding Role Cards */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Your Active Mode
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Blue Card: Seek Solutions */}
              <button
                type="button"
                onClick={() => onRoleChange?.("seeker")}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSeeker
                    ? "border-blue-400 bg-white ring-2 ring-blue-500 shadow-xs"
                    : "border-slate-200/80 bg-white/70 hover:bg-white text-slate-600"
                }`}
              >
                <div>
                  <p className="text-[10px] font-semibold text-blue-600">I need something...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 leading-tight">Seek Solutions</p>
                      <p className="text-[9px] text-slate-400">Companies & Clients</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isSeeker ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isSeeker ? "Active Mode" : "Switch to Blue"}
                  </span>
                </div>
              </button>

              {/* Green Card: Share Skills & Ideas */}
              <button
                type="button"
                onClick={() => onRoleChange?.("creator")}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  !isSeeker
                    ? "border-emerald-400 bg-white ring-2 ring-emerald-500 shadow-xs"
                    : "border-slate-200/80 bg-white/70 hover:bg-white text-slate-600"
                }`}
              >
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600">I can offer something...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 leading-tight">Share Skills</p>
                      <p className="text-[9px] text-slate-400">Builders & Creators</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      !isSeeker ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {!isSeeker ? "Active Mode" : "Switch to Green"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Capabilities Pillars */}
          <div className="rounded-2xl bg-white/80 p-3.5 border border-slate-100 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-900">
                {isSeeker ? "Seeker Capabilities" : "Creator Capabilities"}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isSeeker
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isSeeker ? "Blue Mode" : "Green Mode"}
              </span>
            </div>

            {(isSeeker
              ? [
                  "Discover verified commercial opportunities",
                  "Submit structured milestone proposals",
                  "Secure payments tied to delivered outcomes",
                  "Build verifiable on-chain/platform reputation",
                ]
              : [
                  "Structure complex ideas into commercial drafts",
                  "Match with specialized independent professionals",
                  "Negotiate terms in private AI Deal Rooms",
                  "Release milestone funds upon verified approvals",
                ]
            ).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white shadow-2xs ${
                    isSeeker ? "bg-blue-600" : "bg-emerald-600"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
