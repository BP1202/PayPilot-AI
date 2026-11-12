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
  Edit3,
  ArrowLeft,
  Send,
} from "lucide-react";
import { OpportunityPublic, User } from "@/types";

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityPublic | null;
  onOpenInStudio?: (opp: OpportunityPublic) => void;
  onConnect?: (opp: OpportunityPublic) => void;
  currentUser?: User | null;
  isOwner?: boolean;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onOpenInStudio,
  onConnect,
  currentUser,
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

  const creatorAttribution =
    opportunity.business_name || (opportunity as any).creator_name || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Opportunity Details"
      data-testid="opportunity-detail-modal"
      aria-labelledby="opportunity-detail-title"
    >
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-10">
        {/* Sticky Executive Header */}
        <header className="shrink-0 z-20 border-b border-slate-200/90 bg-white px-5 sm:px-8 py-4">
          {/* Top Row: Navigation, Badges, and Primary Action */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                aria-label="Back to opportunities"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  opportunity.intent === "OFFERING_SOLUTION"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                    : "bg-blue-50 text-blue-800 border border-blue-200/60"
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
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isOwner && onConnect && (
                <button
                  type="button"
                  onClick={() => onConnect(opportunity)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 hover:shadow transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Connect with Creator</span>
                </button>
              )}

              {isOwner && onOpenInStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInStudio(opportunity);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Open in Studio</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Title & Attribution Header (Always visible above scroll) */}
          <div className="pt-3">
            <h2
              id="opportunity-detail-title"
              className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug"
            >
              {opportunity.title}
            </h2>

            <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 pt-1.5 flex-wrap">
              {creatorAttribution && (
                <span className="inline-flex items-center font-medium text-slate-700">
                  <Building2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  {creatorAttribution}
                </span>
              )}
              {creatorAttribution && opportunity.industry && (
                <span className="text-slate-300">•</span>
              )}
              {opportunity.industry && (
                <span className="inline-flex items-center text-slate-600">
                  <Briefcase className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Industry: {opportunity.industry}
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-slate-500">
                <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {formatDate(opportunity.published_at || opportunity.created_at)}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-5 sm:p-8 space-y-6">
          {/* Executive Value Proposition */}
          {opportunity.value_proposition && (
            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/70 p-5 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Executive Value Proposition</span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                {opportunity.value_proposition}
              </p>
            </div>
          )}

          {/* Problem & Solution Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunity.problem_statement && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Problem Statement</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {opportunity.problem_statement}
                </p>
              </div>
            )}

            {opportunity.proposed_solution && (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4 text-emerald-600" />
                  <span>Proposed Solution Concept</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {opportunity.proposed_solution}
                </p>
              </div>
            )}
          </div>

          {/* Required Skills and Capabilities */}
          {opportunity.required_skills_and_resources &&
            opportunity.required_skills_and_resources.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span>Required Capabilities & Resources</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {opportunity.required_skills_and_resources.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-800 border border-slate-200 transition"
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
                <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 uppercase tracking-wider">
                    <Target className="h-4 w-4 text-sky-600" />
                    <span>Target Customers / Audiences</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.target_customer_segments.map((seg, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-100/70 text-sky-800 border border-sky-200/60"
                      >
                        {seg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {opportunity.customer_pain_points &&
              opportunity.customer_pain_points.length > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 uppercase tracking-wider">
                    <Layers className="h-4 w-4 text-rose-600" />
                    <span>Customer Pain Points</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.customer_pain_points.map((pt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100/70 text-rose-800 border border-rose-200/60"
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
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>Commercial & Revenue Models</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {opportunity.potential_business_models.map((bm, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70"
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
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 shadow-xs">
                <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                  Key Assumptions
                </span>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600">
                  {opportunity.key_assumptions.map((assump, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {assump}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.risks_and_uncertainties &&
              opportunity.risks_and_uncertainties.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 shadow-xs">
                  <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                    Risks & Uncertainties
                  </span>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600">
                    {opportunity.risks_and_uncertainties.map((risk, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          {/* Connect & Propose Call to Action Banner */}
          <div className="rounded-3xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-purple-50/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Interested in collaborating on this opportunity?</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                Send a structured connection request to align on scope, deliverables, and milestone agreements in an Opnly Deal Room.
              </p>
            </div>

            {!isOwner && onConnect && (
              <button
                type="button"
                onClick={() => onConnect(opportunity)}
                className="inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg transition cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
                <span>Connect with Creator</span>
              </button>
            )}

            {isOwner && onOpenInStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInStudio(opportunity);
                }}
                className="inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg transition cursor-pointer shrink-0"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit in Studio</span>
              </button>
            )}
          </div>
        </main>

        {/* Modal Footer Bar */}
        <footer className="shrink-0 z-20 border-t border-slate-200/90 bg-white px-5 sm:px-8 py-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Opnly Opportunity Press Profile
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
