"use client";

import React from "react";
import {
  Lightbulb,
  AlertCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  RotateCw,
  Target,
  Rocket,
} from "lucide-react";
import { Opportunity, OpportunityStatus } from "@/types";

interface OpportunityDraftsListProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onCreateNew: () => void;
  selectedStatus?: OpportunityStatus;
  onFilterChange: (status?: OpportunityStatus) => void;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
}

export const OpportunityDraftsList: React.FC<OpportunityDraftsListProps> = ({
  opportunities,
  isLoading,
  error,
  onRetry,
  onSelectOpportunity,
  onCreateNew,
  selectedStatus,
  onFilterChange,
  isAuthenticated = true,
  onSignIn,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Opportunity Drafts Workspace</h2>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              {opportunities.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage 1 & 2: Captured concepts and AI structured opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => onFilterChange(undefined)}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                !selectedStatus ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => onFilterChange("ANALYSED")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                selectedStatus === "ANALYSED"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Analysed
            </button>
            <button
              onClick={() => onFilterChange("DRAFT")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                selectedStatus === "DRAFT"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Drafts
            </button>
          </div>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="h-4 w-1/3 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-6 text-center shadow-xs">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-3">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-amber-950">Unable to load opportunities</h3>
            <p className="text-xs text-amber-800/90 max-w-sm mx-auto mt-1 mb-4">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-900 transition cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Try again</span>
              </button>
            )}
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-xl border border-dashed border-indigo-200 p-8 text-center bg-indigo-50/30">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 mb-3">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Sign in to view your opportunity drafts</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Sign in or create an account to access your saved opportunity drafts and structure them into commercial opportunities across your sessions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {onSignIn && (
                <button
                  onClick={onSignIn}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition cursor-pointer"
                >
                  <span>Sign In / Register</span>
                </button>
              )}
              <button
                onClick={onCreateNew}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Capture an Opportunity</span>
              </button>
            </div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No opportunity drafts yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Capture your first idea or real-world problem. The AI Business Analyst will structure it into a commercial opportunity.
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Capture an Opportunity</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp)}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-400 hover:shadow-md transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Two-sided Intent Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          opp.intent === "OFFERING_SOLUTION"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                        }`}
                      >
                        {opp.intent === "OFFERING_SOLUTION" ? (
                          <Rocket className="h-3 w-3" />
                        ) : (
                          <Target className="h-3 w-3" />
                        )}
                        <span>{opp.intent === "OFFERING_SOLUTION" ? "Offering" : "Seeking"}</span>
                      </span>

                      {/* Category Badge */}
                      <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {opp.category || "BUSINESS"}
                      </span>

                      {/* Format Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          opp.submission_type === "PROBLEM"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {opp.submission_type}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(opp.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                    {opp.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {opp.proposed_solution || opp.problem_statement || opp.original_description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {opp.industry || "General Opportunity"}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition">
                    <span>Open Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
