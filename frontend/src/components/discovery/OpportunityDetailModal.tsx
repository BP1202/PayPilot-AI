"use client";

import React from "react";
import {
  X,
  Building2,
  Calendar,
  Globe,
  Lock,
  Target,
  Sparkles,
  Layers,
  Shield,
  Lightbulb,
  Briefcase,
  AlertTriangle,
  HelpCircle,
  Edit3,
  ArrowLeft,
} from "lucide-react";
import { OpportunityPublic } from "@/types";

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityPublic | null;
  onOpenInStudio?: (opp: OpportunityPublic) => void;
  isOwner?: boolean;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onOpenInStudio,
  isOwner = false,
}) => {
  if (!isOpen || !opportunity) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Recently published";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently published";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 w-screen h-screen overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Opportunity Details"
      data-testid="opportunity-detail-modal"
      aria-labelledby="opportunity-detail-title"
    >
      {/* Full View Header Bar */}
      <header className="shrink-0 z-20 border-b border-slate-200/90 bg-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            aria-label="Back to opportunities"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                opportunity.intent === "OFFERING_SOLUTION"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {opportunity.intent === "OFFERING_SOLUTION"
                ? "Offering Solution"
                : "Seeking Solution"}
            </span>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {opportunity.category}
            </span>

            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                opportunity.visibility === "PUBLIC"
                  ? "bg-sky-50 text-sky-700 border border-sky-100"
                  : "bg-purple-50 text-purple-700 border border-purple-100"
              }`}
            >
              {opportunity.visibility === "PUBLIC" ? (
                <>
                  <Globe className="h-3 w-3 mr-1" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  <span>Members Only</span>
                </>
              )}
            </span>

            {opportunity.business_name && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <Building2 className="h-3 w-3 mr-1 text-slate-500" />
                <span>{opportunity.business_name}</span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Full View Content Canvas */}
      <main className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-3">
            <h2
              id="opportunity-detail-title"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight"
            >
              {opportunity.title}
            </h2>

            <div className="flex items-center space-x-3 text-xs text-slate-500 pt-1">
              {opportunity.industry && (
                <span className="font-medium text-slate-600">
                  Industry: {opportunity.industry}
                </span>
              )}
              {opportunity.industry && <span>•</span>}
              <span className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {formatDate(opportunity.published_at || opportunity.created_at)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6 text-slate-700 text-sm">
          {/* Value Proposition Hero Box */}
          {opportunity.value_proposition && (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 p-4">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Value Proposition</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                {opportunity.value_proposition}
              </p>
            </div>
          )}

          {/* Problem Statement */}
          {opportunity.problem_statement && (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Problem Statement</span>
              </div>
              <p className="text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                {opportunity.problem_statement}
              </p>
            </div>
          )}

          {/* Proposed Solution */}
          {opportunity.proposed_solution && (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-600" />
                <span>Proposed Solution Concept</span>
              </div>
              <p className="text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                {opportunity.proposed_solution}
              </p>
            </div>
          )}

          {/* Required Skills and Capabilities */}
          {opportunity.required_skills_and_resources &&
            opportunity.required_skills_and_resources.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Required Skills & Resources</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.required_skills_and_resources.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Target Customer Segments & Pain Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {opportunity.target_customer_segments &&
              opportunity.target_customer_segments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Target className="h-3.5 w-3.5 text-sky-600" />
                    <span>Target Customers / Audiences</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.target_customer_segments.map((seg, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-100"
                      >
                        {seg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {opportunity.customer_pain_points &&
              opportunity.customer_pain_points.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Layers className="h-3.5 w-3.5 text-rose-600" />
                    <span>Customer Pain Points</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.customer_pain_points.map((pt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-100"
                      >
                        {pt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Potential Business Models */}
          {opportunity.potential_business_models &&
            opportunity.potential_business_models.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Commercial Models</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.potential_business_models.map((bm, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100"
                    >
                      {bm}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Key Assumptions & Risks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {opportunity.key_assumptions && opportunity.key_assumptions.length > 0 && (
              <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">
                  Key Assumptions:
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                  {opportunity.key_assumptions.map((assump, idx) => (
                    <li key={idx} className="leading-snug">
                      {assump}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.risks_and_uncertainties &&
              opportunity.risks_and_uncertainties.length > 0 && (
                <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-800 block">
                    Risks & Uncertainties:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                    {opportunity.risks_and_uncertainties.map((risk, idx) => (
                      <li key={idx} className="leading-snug">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Full View Footer Bar */}
      <footer className="shrink-0 z-20 border-t border-slate-200/90 bg-white px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Opnly Opportunity Press Profile
          </span>

          <div className="flex items-center space-x-3">
            {isOwner && onOpenInStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInStudio(opportunity);
                }}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Open in Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
