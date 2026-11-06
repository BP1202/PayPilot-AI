"use client";

import React from "react";
import {
  Handshake,
  CheckCircle2,
  Target,
  Rocket,
  ArrowRight,
  Search,
  Briefcase,
  User,
  PlusCircle,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { OpportunityIntent } from "@/types";
import { DashboardView } from "./AppSidebar";

export type UserRole = "seeker" | "creator";

interface OpportunityHeroBannerProps {
  role?: UserRole;
  userName?: string | null;
  onNavigate?: (view: DashboardView) => void;
  onQuickAction?: (intent: OpportunityIntent) => void;
  onCreateOpportunity?: () => void;
}

export const OpportunityHeroBanner: React.FC<OpportunityHeroBannerProps> = ({
  role = "seeker",
  userName,
  onNavigate,
  onQuickAction,
  onCreateOpportunity,
}) => {
  const isSeeker = role === "seeker";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/60 p-6 sm:p-8 shadow-xs space-y-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Vision & Primary Information */}
        <div className="lg:col-span-7 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
            <Sparkles className="h-3 w-3" />
            <span>
              {isSeeker
                ? "Seeker Workspace · Opnly Opportunity Network"
                : "Opportunity Creator · Opnly Opportunity Network"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Turn Ideas Into Impact —{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {isSeeker
                ? "Where Talent Finds Real Opportunities"
                : "Where Business Problems Find Proven Talent"}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            {isSeeker
              ? "Discover verified commercial initiatives, submit structured milestone proposals, and get paid for verified outcomes in secure AI Deal Rooms."
              : "Publish your business problems, evaluate candidate capability proposals, and coordinate verified milestone execution in structured AI Deal Rooms."}
          </p>

          {/* Action-First Buttons Row */}
          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Action-First Controls
            </p>
            {isSeeker ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.("browse")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Find Opportunities</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("browse")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition cursor-pointer"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  <span>Apply Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("deal-rooms")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Capture Opportunity</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("collaborations")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Review Proposals</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("browse")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-indigo-600" />
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

          {/* Secondary Quick Intents */}
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-medium">Quick actions:</span>
            <button
              type="button"
              onClick={() => onQuickAction?.("SEEKING_SOLUTION")}
              className="font-bold text-indigo-600 hover:text-indigo-800 transition underline underline-offset-2 cursor-pointer"
            >
              Post a Request
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onQuickAction?.("OFFERING_SOLUTION")}
              className="font-bold text-emerald-600 hover:text-emerald-800 transition underline underline-offset-2 cursor-pointer"
            >
              Create Opportunity
            </button>
          </div>
        </div>

        {/* Right Column: Role Highlights & Value Pillars */}
        <div className="lg:col-span-5 lg:border-l lg:border-indigo-100 lg:pl-6 space-y-3">
          <div className="rounded-2xl bg-white/80 p-4 border border-indigo-50 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-900">
                {isSeeker ? "Seeker Capabilities" : "Creator Capabilities"}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Active Role
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
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xs">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
