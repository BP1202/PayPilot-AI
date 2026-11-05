"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
} from "lucide-react";
import { Proposal, ProposalStatus, User as UserType } from "@/types";
import { respondToProposal } from "@/lib/api";

interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal;
  currentUser: UserType | null;
  onUpdate?: (updated: Proposal) => void;
}

const STATUS_BADGE: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  isOpen,
  onClose,
  proposal: initialProposal,
  currentUser,
  onUpdate,
}) => {
  const [proposal, setProposal] = useState<Proposal>(initialProposal);
  const [activeTab, setActiveTab] = useState<"terms" | "history" | "agreement">(
    "terms"
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Revision / Reject note modal states
  const [actionPrompt, setActionPrompt] = useState<
    "ACCEPT" | "REQUEST_REVISION" | "REJECT" | "WITHDRAW" | null
  >(null);
  const [promptNote, setPromptNote] = useState("");

  if (!isOpen) return null;

  const isProposer = currentUser?.id === proposal.proposer.user_id;
  const isRecipient = currentUser?.id === proposal.recipient.user_id;
  const isAccepted = proposal.status === "ACCEPTED";

  const handleAction = async (
    action: "ACCEPT" | "REQUEST_REVISION" | "REJECT" | "WITHDRAW"
  ) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await respondToProposal(proposal.id, {
        action,
        note: promptNote.trim() || undefined,
      });
      setProposal(updated);
      onUpdate?.(updated);
      setActionPrompt(null);
      setPromptNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update proposal status";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50/50 via-white to-indigo-50/30">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  STATUS_BADGE[proposal.status].className
                }`}
              >
                {STATUS_BADGE[proposal.status].label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                v{proposal.current_version}
              </span>
              {proposal.opportunity_title && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {proposal.opportunity_title}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {proposal.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                By {proposal.proposer.full_name || "Proposer"}
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                For {proposal.recipient.full_name || "Recipient"}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {new Date(proposal.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-sm text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <p>{actionError}</p>
          </div>
        )}

        {/* Mutual Acceptance Banner */}
        {isAccepted && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-900">
                Collaboration Agreement Accepted (v{proposal.accepted_version || proposal.current_version})
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Both parties have explicitly agreed to these terms. This records mutual agreement within PayPilot to advance to Stage 7: AI Deal Room for formalization. It does not execute an automated legal contract or disburse payments.
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-emerald-700 font-medium">
                {proposal.proposer_accepted_at && (
                  <span>
                    Proposer confirmed: {new Date(proposal.proposer_accepted_at).toLocaleString()}
                  </span>
                )}
                {proposal.recipient_accepted_at && (
                  <span>
                    Recipient confirmed: {new Date(proposal.recipient_accepted_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Revision Requested Notice */}
        {proposal.status === "REVISION_REQUESTED" && proposal.revision_requested_note && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">Revision Requested</p>
              <p className="text-xs text-amber-800 italic">
                &ldquo;{proposal.revision_requested_note}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab("terms")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "terms"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            Scope & Terms
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="h-4 w-4" />
            Revision History ({proposal.revisions?.length || 1})
          </button>
          {isAccepted && (
            <button
              onClick={() => setActiveTab("agreement")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "agreement"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Deal Room Readiness
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {activeTab === "terms" && (
            <div className="space-y-6">
              {/* Financial & Timeline Summary Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100/80">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                    Proposed Budget
                  </span>
                  <span className="text-xl font-extrabold text-indigo-950 mt-1 block">
                    {proposal.budget_amount
                      ? `$${Number(proposal.budget_amount).toLocaleString()} ${proposal.currency}`
                      : "Not specified"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Estimated Duration
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-1 block">
                    {proposal.estimated_duration_days
                      ? `${proposal.estimated_duration_days} days`
                      : proposal.timeline_summary || "Flexible"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Milestones Count
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-1 block">
                    {proposal.milestones?.length || 0} stages
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Summary & Context
                </h4>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {proposal.description}
                </p>
              </div>

              {/* Scope of Work */}
              {proposal.scope_of_work && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Proposed Scope of Work
                  </h4>
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                    {proposal.scope_of_work}
                  </p>
                </div>
              )}

              {/* Deliverables */}
              {proposal.deliverables && proposal.deliverables.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Expected Deliverables
                  </h4>
                  <ul className="space-y-1.5">
                    {proposal.deliverables.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Milestones Table */}
              {proposal.milestones && proposal.milestones.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Proposed Milestones
                  </h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                        <tr>
                          <th className="p-3">Stage / Title</th>
                          <th className="p-3">Deliverable Description</th>
                          <th className="p-3">Target Date</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {proposal.milestones.map((ms, idx) => (
                          <tr key={ms.id || idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">
                              {ms.title}
                            </td>
                            <td className="p-3 text-slate-600">
                              {ms.description || "—"}
                            </td>
                            <td className="p-3 text-slate-500">
                              {ms.target_date || "TBD"}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              ${Number(ms.amount).toLocaleString()} {proposal.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              {proposal.responsibilities &&
                Object.keys(proposal.responsibilities).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Participant Responsibilities
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(proposal.responsibilities).map(([role, duties]) => (
                        <div
                          key={role}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80"
                        >
                          <span className="text-xs font-bold text-slate-900 capitalize block">
                            {role}
                          </span>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {duties}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Assumptions & Conditions */}
              {((proposal.assumptions && proposal.assumptions.length > 0) ||
                (proposal.conditions && proposal.conditions.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {proposal.assumptions && proposal.assumptions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Assumptions
                      </h4>
                      <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                        {proposal.assumptions.map((assump, idx) => (
                          <li key={idx}>{assump}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {proposal.conditions && proposal.conditions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Conditions & Dependencies
                      </h4>
                      <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                        {proposal.conditions.map((cond, idx) => (
                          <li key={idx}>{cond}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Notes */}
              {proposal.notes && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Additional Notes
                  </h4>
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl">
                    {proposal.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Auditable snapshot record of all terms revisions submitted for this collaboration proposal.
              </p>
              {proposal.revisions && proposal.revisions.length > 0 ? (
                <div className="space-y-3">
                  {proposal.revisions.map((rev) => (
                    <div
                      key={rev.id || rev.version}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          Version {rev.version}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(rev.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-900">{rev.title}</h5>
                      {rev.change_summary && (
                        <p className="text-xs text-slate-600 italic">
                          Change note: &ldquo;{rev.change_summary}&rdquo;
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                        <span>
                          Budget: ${Number(rev.budget_amount || 0).toLocaleString()} {rev.currency}
                        </span>
                        <span>·</span>
                        <span>{rev.milestones?.length || 0} Milestones</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <History className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Initial version 1. No subsequent revisions have been submitted.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "agreement" && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-tr from-indigo-50 via-white to-violet-50 rounded-3xl border border-indigo-100/80 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <h4>Stage 7: AI Deal Room Transition</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Now that both parties have explicitly agreed to version {proposal.accepted_version || proposal.current_version}, the project terms, milestones, and deliverables are locked into an auditable collaboration agreement.
                </p>
                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-1">
                  <div className="font-bold">Next Automated Capabilities in Deal Room:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Generate bilateral commercial milestone escrow contracts</li>
                    <li>Connect approved deliverable milestones to verified PayPal settlements</li>
                    <li>Immutable logging in the PayPilot Commerce Ledger</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Prompt Dialog (Inline) */}
        {actionPrompt && (
          <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {actionPrompt === "ACCEPT" && "Confirm Proposal Acceptance"}
                {actionPrompt === "REQUEST_REVISION" && "Request Changes to Terms"}
                {actionPrompt === "REJECT" && "Decline Proposal"}
                {actionPrompt === "WITHDRAW" && "Withdraw Proposal"}
              </span>
              <button
                onClick={() => setActionPrompt(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
            {actionPrompt === "ACCEPT" ? (
              <p className="text-xs text-slate-600">
                You are agreeing to version {proposal.current_version} with budget $
                {Number(proposal.budget_amount || 0).toLocaleString()} {proposal.currency}. This records mutual acceptance for the AI Deal Room.
              </p>
            ) : (
              <textarea
                value={promptNote}
                onChange={(e) => setPromptNote(e.target.value)}
                placeholder={
                  actionPrompt === "REQUEST_REVISION"
                    ? "Explain what terms or milestones you would like adjusted..."
                    : actionPrompt === "REJECT"
                    ? "Reason for declining (optional)..."
                    : "Withdrawal reason (optional)..."
                }
                rows={2}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionPrompt(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(actionPrompt)}
                disabled={actionLoading}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white flex items-center gap-1.5 ${
                  actionPrompt === "ACCEPT"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionPrompt === "REQUEST_REVISION"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm {actionPrompt.replace("_", " ")}
              </button>
            </div>
          </div>
        )}

        {/* Footer Action Bar */}
        {!actionPrompt && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Proposal ID: {proposal.id}
            </span>
            <div className="flex items-center gap-2">
              {/* Recipient Actions */}
              {isRecipient &&
                (proposal.status === "SUBMITTED" ||
                  proposal.status === "UNDER_REVIEW") && (
                  <>
                    <button
                      onClick={() => setActionPrompt("REJECT")}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => setActionPrompt("REQUEST_REVISION")}
                      className="px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 border border-amber-200 rounded-xl transition-all"
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => setActionPrompt("ACCEPT")}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept Terms
                    </button>
                  </>
                )}

              {/* Proposer Actions */}
              {isProposer &&
                !isAccepted &&
                proposal.status !== "WITHDRAWN" &&
                proposal.status !== "REJECTED" && (
                  <button
                    onClick={() => setActionPrompt("WITHDRAW")}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 border border-slate-300 rounded-xl transition-all"
                  >
                    Withdraw
                  </button>
                )}

              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

