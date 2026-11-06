"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
} from "lucide-react";
import { MatchExplanation, MatchTier } from "@/types";

interface MatchRationaleCardProps {
  explanation: MatchExplanation;
  compact?: boolean;
}

export const getTierBadge = (tier: MatchTier) => {
  switch (tier) {
    case "STRONG_MATCH":
      return {
        label: "Strong Match",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dotColor: "bg-emerald-500",
      };
    case "MODERATE_MATCH":
      return {
        label: "Moderate Match",
        className: "bg-indigo-50 text-indigo-800 border-indigo-200",
        dotColor: "bg-indigo-500",
      };
    case "EXPLORATORY":
    default:
      return {
        label: "Exploratory Match",
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotColor: "bg-slate-400",
      };
  }
};

export const MatchRationaleCard: React.FC<MatchRationaleCardProps> = ({
  explanation,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const badge = getTierBadge(explanation.match_tier);

  return (
    <div
      data-testid="match-rationale-card"
      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5 text-xs transition"
    >
      {/* Header: Tier + Mode */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            data-testid="match-tier-badge"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dotColor}`} />
            {badge.label}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Score: {Math.round(explanation.score * 100)}/100
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
          {explanation.mode === "LIVE_AI" ? (
            <>
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>AI-Enriched Rationale</span>
            </>
          ) : (
            <>
              <Cpu className="h-3 w-3 text-slate-500" />
              <span>Deterministic Heuristic</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Narrative */}
      <p className="text-slate-700 leading-relaxed font-medium">
        {explanation.explanation_summary}
      </p>

      {/* Expand/Collapse Toggle if compact */}
      {compact && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{expanded ? "Hide Match Signals" : "View Match Signals & Gaps"}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}

      {/* Structured Grounded Signals */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {/* Strong Signals */}
          {Array.isArray(explanation.strong_signals) && explanation.strong_signals.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Verified Alignment
              </span>
              <ul className="space-y-0.5 pl-4 list-disc text-slate-600 text-[11px]">
                {explanation.strong_signals.map((signal, idx) => (
                  <li key={idx}>{signal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Partial Signals */}
          {Array.isArray(explanation.partial_signals) && explanation.partial_signals.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                <Layers className="h-3 w-3 text-indigo-600" />
                Adjacent Capabilities
              </span>
              <ul className="space-y-0.5 pl-4 list-disc text-slate-600 text-[11px]">
                {explanation.partial_signals.map((signal, idx) => (
                  <li key={idx}>{signal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Potential Gaps (Transparent, no deception) */}
          {Array.isArray(explanation.potential_gaps) && explanation.potential_gaps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                Potential Gaps / Unmatched
              </span>
              <ul className="space-y-0.5 pl-4 list-disc text-slate-600 text-[11px]">
                {explanation.potential_gaps.map((gap, idx) => (
                  <li key={idx}>{gap}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Information */}
          {Array.isArray(explanation.missing_information) && explanation.missing_information.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                Missing Context
              </span>
              <ul className="space-y-0.5 pl-4 list-disc text-slate-500 text-[11px]">
                {explanation.missing_information.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

