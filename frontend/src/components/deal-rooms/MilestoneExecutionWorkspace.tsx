"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MilestoneExecution,
  MilestoneListResponse,
  MilestoneEvidence,
  MilestoneEvidenceType,
  MilestoneReviewDecision,
  MilestoneAIAnalysisResponse,
  User,
  DealRoomMilestoneItem,
} from "@/types";
import {
  initializeDealRoomMilestones,
  fetchDealRoomMilestones,
  startMilestoneWork,
  submitMilestoneEvidence,
  reviewMilestoneEvidence,
  cancelDealRoomMilestone,
  analyzeMilestoneAI,
} from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ExternalLink,
  FileText,
  ShieldCheck,
  RefreshCw,
  Send,
  DollarSign,
  User as UserIcon,
  ListChecks,
  AlertTriangle,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  XCircle,
} from "lucide-react";

interface MilestoneExecutionWorkspaceProps {
  roomId: string;
  currentUser: User | null;
  agreedMilestones: DealRoomMilestoneItem[];
  currency: string;
}

export function MilestoneExecutionWorkspace({
  roomId,
  currentUser,
  agreedMilestones,
  currency,
}: MilestoneExecutionWorkspaceProps) {
  const [milestonesData, setMilestonesData] = useState<MilestoneListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Active Actions
  const [activeMilestone, setActiveMilestone] = useState<MilestoneExecution | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Evidence Modal State
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [evidenceType, setEvidenceType] = useState<MilestoneEvidenceType>("EXTERNAL_REFERENCE");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  // Audit trail expanded state per milestone
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<MilestoneReviewDecision>("APPROVED");
  const [reviewComments, setReviewComments] = useState("");

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // AI Copilot Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<MilestoneAIAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDealRoomMilestones(roomId);
      setMilestonesData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load milestones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const handleInitialize = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await initializeDealRoomMilestones(roomId);
      await loadMilestones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initialize milestones";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async (milestone: MilestoneExecution) => {
    try {
      setActionLoading(true);
      setError(null);
      await startMilestoneWork(roomId, milestone.id);
      await loadMilestones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start milestone";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEvidenceModal = (milestone: MilestoneExecution) => {
    setActiveMilestone(milestone);
    setEvidenceTitle(
      milestone.current_evidence_submission
        ? `Revision: ${milestone.title}`
        : `Deliverables: ${milestone.title}`
    );
    setEvidenceDescription("");
    setEvidenceNotes("");
    setEvidenceType("EXTERNAL_REFERENCE");
    setEvidenceUrl("");
    setIsEvidenceModalOpen(true);
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMilestone || !evidenceTitle.trim() || !evidenceDescription.trim() || !evidenceUrl.trim()) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await submitMilestoneEvidence(roomId, activeMilestone.id, {
        title: evidenceTitle.trim(),
        description: evidenceDescription.trim(),
        evidence_type: evidenceType,
        reference_url: evidenceUrl.trim(),
        submission_notes: evidenceNotes.trim() || undefined,
      });
      setIsEvidenceModalOpen(false);
      await loadMilestones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit evidence";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReviewModal = (milestone: MilestoneExecution) => {
    setActiveMilestone(milestone);
    setReviewDecision("APPROVED");
    setReviewComments("");
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMilestone || !activeMilestone.current_evidence_submission) return;

    if (
      (reviewDecision === "REVISION_REQUESTED" || reviewDecision === "REJECTED") &&
      !reviewComments.trim()
    ) {
      alert(
        reviewDecision === "REJECTED"
          ? "A mandatory rejection reason is required when rejecting deliverables."
          : "Feedback comments are required when requesting revisions."
      );
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await reviewMilestoneEvidence(roomId, activeMilestone.id, {
        evidence_id: activeMilestone.current_evidence_submission.id,
        decision: reviewDecision,
        comments: reviewComments.trim() || undefined,
      });
      setIsReviewModalOpen(false);
      await loadMilestones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record review";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCancelModal = (milestone: MilestoneExecution) => {
    setActiveMilestone(milestone);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const handleSubmitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMilestone || !cancelReason.trim()) return;

    try {
      setActionLoading(true);
      setError(null);
      await cancelDealRoomMilestone(roomId, activeMilestone.id, cancelReason.trim());
      setIsCancelModalOpen(false);
      await loadMilestones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel milestone";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunAIAnalysis = async (milestone: MilestoneExecution) => {
    setActiveMilestone(milestone);
    setAiAnalysis(null);
    setIsAIModalOpen(true);
    setAiLoading(true);
    try {
      const result = await analyzeMilestoneAI(roomId, milestone.id);
      setAiAnalysis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI Copilot analysis failed";
      setError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading milestone execution workspace...</p>
      </div>
    );
  }

  const items = milestonesData?.items || [];
  const totalAgreed = milestonesData?.total_agreed_amount ? Number(milestonesData.total_agreed_amount) : 0;
  const approvedTotal = milestonesData?.approved_amount ? Number(milestonesData.approved_amount) : 0;
  const completionPercentage = totalAgreed > 0 ? Math.round((approvedTotal / totalAgreed) * 100) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Zero Milestones Initial State */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
            <ListChecks className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              Initialize Milestone Execution
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transform the {agreedMilestones.length} agreed roadmap stages from your accepted proposal into
              trackable milestones, deliverable submissions, and verified reviews.
            </p>
          </div>
          <button
            onClick={handleInitialize}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {actionLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Initialize Milestones from Agreed Terms</span>
          </button>
        </div>
      ) : (
        <>
          {/* Header Progress Dashboard */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Milestone Execution & Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Trackable deliverable submissions, evidence checks, and verified dual-consent approvals.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Verified Budget Progress
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    ${approvedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} / $
                    {totalAgreed.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Overall Completion</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, completionPercentage)}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Milestones</span>
                <p className="text-sm font-bold text-slate-900">{milestonesData?.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-500 uppercase">In Progress</span>
                <p className="text-sm font-bold text-blue-900">{milestonesData?.in_progress_count || 0}</p>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-500 uppercase">Pending Review</span>
                <p className="text-sm font-bold text-amber-900">{milestonesData?.pending_review_count || 0}</p>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Approved</span>
                <p className="text-sm font-bold text-emerald-900">{milestonesData?.completed_count || 0}</p>
              </div>
            </div>
          </div>

          {/* Milestone Items List */}
          <div className="space-y-4">
            {items.map((milestone) => {
              const isResponsible = currentUser?.id === milestone.responsible_user.user_id;
              const isReviewer = currentUser?.id === milestone.reviewer_user.user_id;
              const hasEvidence = !!milestone.current_evidence_submission;

              // Status styles
              let statusBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
              let statusLabel = "Not Started";
              if (milestone.status === "IN_PROGRESS") {
                statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                statusLabel = "In Progress";
              } else if (milestone.status === "SUBMITTED_FOR_REVIEW") {
                statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
                statusLabel = "Under Review";
              } else if (milestone.status === "REVISION_REQUESTED") {
                statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-300";
                statusLabel = "Revision Requested";
              } else if (milestone.status === "REJECTED") {
                statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-300 font-bold";
                statusLabel = "Submission Rejected";
              } else if (milestone.status === "APPROVED") {
                statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                statusLabel = "Approved";
              } else if (milestone.status === "CANCELLED") {
                statusBadgeClass = "bg-slate-100 text-slate-400 border-slate-200 line-through";
                statusLabel = "Cancelled";
              }

              return (
                <div
                  key={milestone.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 transition hover:border-slate-300"
                >
                  {/* Top Row: Index, Title, Status, Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="h-7 w-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {milestone.milestone_index + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{milestone.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadgeClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        {milestone.description && (
                          <p className="text-xs text-slate-600 mt-1">{milestone.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {milestone.agreed_amount && (
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-700">
                            ${Number(milestone.agreed_amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {milestone.currency}
                          </span>
                          {milestone.due_days && (
                            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{milestone.due_days} days sprint</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expected Deliverables */}
                  {milestone.expected_deliverables && milestone.expected_deliverables.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Agreed Deliverables Checklist
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {milestone.expected_deliverables.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Responsible & Reviewer Participant Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Responsible Worker
                        </span>
                        <span className="font-semibold text-slate-800">
                          {milestone.responsible_user.name}{" "}
                          {isResponsible && (
                            <span className="text-[10px] text-blue-600 font-bold ml-1">(You)</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Designated Reviewer
                        </span>
                        <span className="font-semibold text-slate-800">
                          {milestone.reviewer_user.name}{" "}
                          {isReviewer && (
                            <span className="text-[10px] text-purple-600 font-bold ml-1">(You)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Current Evidence Submission Box */}
                  {hasEvidence && milestone.current_evidence_submission && (
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                          <h5 className="text-xs font-bold text-slate-900">
                            Submission v{milestone.current_evidence_submission.submission_version}:{" "}
                            {milestone.current_evidence_submission.title}
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700">
                          {milestone.current_evidence_submission.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {milestone.current_evidence_submission.description}
                      </p>

                      {milestone.current_evidence_submission.submission_notes && (
                        <div className="bg-white/80 border border-indigo-100 rounded-xl p-2.5 text-xs text-slate-700">
                          <span className="font-bold text-slate-800 block text-[10px] uppercase text-indigo-700">
                            Submission Notes:
                          </span>
                          <p className="mt-0.5 whitespace-pre-wrap">
                            {milestone.current_evidence_submission.submission_notes}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100/60 text-[11px]">
                        <a
                          href={milestone.current_evidence_submission.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Inspect Deliverables Reference</span>
                        </a>
                        <span className="text-slate-400">
                          Submitted by {milestone.current_evidence_submission.submitter_name} •{" "}
                          {new Date(milestone.current_evidence_submission.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payment Readiness Banner (when Approved) */}
                  {milestone.status === "APPROVED" && (
                    <div
                      className={`rounded-2xl p-4 flex items-start gap-3 text-xs border ${
                        milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 shrink-0 mt-0.5 ${
                          milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW"
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }`}
                      />
                      <div className="space-y-1">
                        <p className="font-bold">
                          {milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW"
                            ? "Payment Readiness: Ready for Payment Review"
                            : "Milestone Verified & Approved (Non-monetary)"}
                        </p>
                        <p
                          className={`text-[11px] leading-relaxed ${
                            milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW"
                              ? "text-emerald-800"
                              : "text-slate-600"
                          }`}
                        >
                          {milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW"
                            ? `Dual-consent verified. Counterparty approved deliverables (Submission v${
                                milestone.current_evidence_submission?.submission_version || 1
                              }). This record forms the auditable bridge to the upcoming PayPal transaction & escrow release module.`
                            : `Dual-consent verified. Counterparty approved deliverables. This milestone has no financial obligation ($0.00 agreed amount) and does not require payment settlement.`}
                        </p>
                        {milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW" && (
                          <p className="text-[10px] font-semibold text-emerald-700 italic">
                            Note: PayPal settlement execution occurs in the upcoming transaction module; no automated fund transfer takes place in this step.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expandable Deliverable & Review Audit Trail */}
                  {((milestone.evidence_history && milestone.evidence_history.length > 0) ||
                    (milestone.review_history && milestone.review_history.length > 0)) && (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAuditIds((prev) => ({
                            ...prev,
                            [milestone.id]: !prev[milestone.id],
                          }))
                        }
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:bg-slate-100/70 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-indigo-600" />
                          <span>
                            Deliverable & Review Audit Trail ({milestone.evidence_submissions_count} submissions, {milestone.reviews_count} reviews)
                          </span>
                        </div>
                        {expandedAuditIds[milestone.id] ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      {expandedAuditIds[milestone.id] && (
                        <div className="p-4 space-y-4 border-t border-slate-200/80 bg-white">
                          {/* Submissions Timeline */}
                          {milestone.evidence_history && milestone.evidence_history.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Evidence Submissions History
                              </span>
                              <div className="space-y-2">
                                {milestone.evidence_history.map((evi) => (
                                  <div
                                    key={evi.id}
                                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-slate-900">
                                          v{evi.submission_version}: {evi.title}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                            evi.status === "APPROVED"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : evi.status === "REVISION_REQUESTED"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : evi.status === "REJECTED"
                                              ? "bg-rose-50 text-rose-700 border-rose-200"
                                              : evi.status === "SUPERSEDED"
                                              ? "bg-slate-100 text-slate-400 border-slate-200"
                                              : "bg-blue-50 text-blue-700 border-blue-200"
                                          }`}
                                        >
                                          {evi.status}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(evi.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-slate-600">{evi.description}</p>
                                    {evi.submission_notes && (
                                      <div className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-slate-700">
                                        <span className="font-bold text-slate-500 block text-[9px] uppercase">
                                          Notes:
                                        </span>
                                        {evi.submission_notes}
                                      </div>
                                    )}
                                    <div className="pt-1">
                                      <a
                                        href={evi.reference_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span>{evi.reference_url}</span>
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reviews Timeline */}
                          {milestone.review_history && milestone.review_history.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Review Decisions History
                              </span>
                              <div className="space-y-2">
                                {milestone.review_history.map((rev) => (
                                  <div
                                    key={rev.id}
                                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">{rev.reviewer_name}</span>
                                        <span className="text-[10px] text-slate-400">
                                          (reviewed v{rev.evidence_version})
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                            rev.decision === "APPROVED"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : rev.decision === "REVISION_REQUESTED"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-rose-50 text-rose-700 border-rose-200"
                                          }`}
                                        >
                                          {rev.decision}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(rev.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    {rev.comments && (
                                      <p className="text-slate-600 text-[11px] italic bg-white p-2 rounded-lg border border-slate-200">
                                        &quot;{rev.comments}&quot;
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cancellation Reason if Cancelled */}
                  {milestone.status === "CANCELLED" && milestone.cancellation_reason && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600">
                      <span className="font-bold text-slate-700">Cancellation Reason: </span>
                      {milestone.cancellation_reason}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {/* AI Copilot Button */}
                      <button
                        onClick={() => handleRunAIAnalysis(milestone)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-700 text-xs font-bold hover:bg-indigo-100/60 transition cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        <span>AI Review Assistant</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Start / Resume Work Button (Responsible User only) */}
                      {isResponsible &&
                        (milestone.status === "NOT_STARTED" ||
                          milestone.status === "REVISION_REQUESTED" ||
                          milestone.status === "REJECTED") && (
                          <button
                            onClick={() => handleStartWork(milestone)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>
                              {milestone.status === "REVISION_REQUESTED" || milestone.status === "REJECTED"
                                ? "Resume Work"
                                : "Start Work"}
                            </span>
                          </button>
                        )}

                      {/* Submit Deliverables Button (Responsible User only) */}
                      {isResponsible &&
                        (milestone.status === "IN_PROGRESS" ||
                          milestone.status === "REVISION_REQUESTED" ||
                          milestone.status === "REJECTED") && (
                          <button
                            onClick={() => handleOpenEvidenceModal(milestone)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>
                              {milestone.status === "REVISION_REQUESTED" || milestone.status === "REJECTED"
                                ? "Resubmit Deliverables"
                                : "Submit Deliverables"}
                            </span>
                          </button>
                        )}

                      {/* Review Deliverables Button (Reviewer only, Prevent Self-Approval) */}
                      {milestone.status === "SUBMITTED_FOR_REVIEW" && (
                        <>
                          {isReviewer ? (
                            <button
                              onClick={() => handleOpenReviewModal(milestone)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Review Deliverables</span>
                            </button>
                          ) : isResponsible ? (
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              Awaiting Counterparty Review (Self-Approval Restricted)
                            </span>
                          ) : null}
                        </>
                      )}

                      {/* Cancel Milestone Button (Non-approved, non-cancelled) */}
                      {milestone.status !== "APPROVED" && milestone.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleOpenCancelModal(milestone)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL 1: EVIDENCE SUBMISSION */}
      {isEvidenceModalOpen && activeMilestone && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Submit Milestone Deliverables
                </h3>
                <p className="text-xs text-slate-500">
                  Provide evidence and references for {activeMilestone.title}
                </p>
              </div>
              <button
                onClick={() => setIsEvidenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Submission Title</label>
                <input
                  type="text"
                  required
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Initial Backend API Deployment & Swagger Docs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Evidence Type</label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as MilestoneEvidenceType)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="EXTERNAL_REFERENCE">External Reference</option>
                    <option value="CODE_REPOSITORY">Code Repository</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO_LINK">Video Walkthrough</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Deliverable URL</label>
                  <input
                    type="url"
                    required
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Deliverables Summary</label>
                <textarea
                  rows={3}
                  required
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Explain what has been completed, test coverage, and instructions for verification..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Submission Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Additional context, verification credentials, environment details, or instructions..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEvidenceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Confirm Deliverable Submission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REVIEW DECISION */}
      {isReviewModalOpen && activeMilestone && activeMilestone.current_evidence_submission && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Review Deliverables: {activeMilestone.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Submission v{activeMilestone.current_evidence_submission.submission_version} by{" "}
                  {activeMilestone.current_evidence_submission.submitter_name}
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Review Decision</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                      reviewDecision === "APPROVED"
                        ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={reviewDecision === "APPROVED"}
                      onChange={() => setReviewDecision("APPROVED")}
                      className="text-emerald-600"
                    />
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs">Approve</span>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                      reviewDecision === "REVISION_REQUESTED"
                        ? "border-amber-500 bg-amber-50/60 text-amber-950 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REVISION_REQUESTED"
                      checked={reviewDecision === "REVISION_REQUESTED"}
                      onChange={() => setReviewDecision("REVISION_REQUESTED")}
                      className="text-amber-600"
                    />
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs">Request Revision</span>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                      reviewDecision === "REJECTED"
                        ? "border-rose-500 bg-rose-50/60 text-rose-950 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewDecision === "REJECTED"}
                      onChange={() => setReviewDecision("REJECTED")}
                      className="text-rose-600"
                    />
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span className="text-xs">Reject Submission</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Feedback & Review Comments{" "}
                  {reviewDecision === "APPROVED" ? (
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  ) : (
                    <span className="text-rose-600 font-bold">* (Required)</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  required={reviewDecision === "REVISION_REQUESTED" || reviewDecision === "REJECTED"}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder={
                    reviewDecision === "REVISION_REQUESTED"
                      ? "Explain specifically what changes or additions are required before approval..."
                      : reviewDecision === "REJECTED"
                      ? "State the clear reason why these deliverables were rejected..."
                      : "Add any feedback, notes, or sign-off remarks..."
                  }
                />
              </div>

              {reviewDecision === "APPROVED" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                  <span className="font-bold">Notice:</span> Approving this milestone marks it as verified and
                  updates payment readiness to Ready for Review for the upcoming PayPal module.
                </div>
              )}

              {reviewDecision === "REJECTED" && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900">
                  <span className="font-bold">Notice:</span> Rejecting deliverables marks this submission as rejected and requires a clear reason. The contributor will be able to resume work and submit an updated revision.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                    reviewDecision === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : reviewDecision === "REJECTED"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {actionLoading
                    ? "Recording..."
                    : reviewDecision === "APPROVED"
                    ? "Confirm Approval"
                    : reviewDecision === "REJECTED"
                    ? "Confirm Deliverable Rejection"
                    : "Confirm Revision Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL MILESTONE */}
      {isCancelModalOpen && activeMilestone && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Cancel Milestone</h3>
                <p className="text-xs text-slate-500">{activeMilestone.title}</p>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCancel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Cancellation Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Provide explicit context for cancelling this milestone..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Keep Milestone
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: AI COPILOT DELIVERABLE ANALYSIS */}
      {isAIModalOpen && activeMilestone && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    AI Deliverable Verification Copilot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Grounded evaluation against agreed proposal scope for: {activeMilestone.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {aiLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-600 font-medium">
                  Analysing deliverable evidence against agreed specifications...
                </p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-5">
                {/* Score & Mode Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Estimated Completeness Score
                    </span>
                    <span className="text-2xl font-black text-indigo-600">
                      {aiAnalysis.completeness_score}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100/60 text-indigo-800">
                      {aiAnalysis.mode} ({aiAnalysis.model})
                    </span>
                  </div>
                </div>

                {/* Deliverables Analysis */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Deliverables Alignment Check
                  </h4>
                  <div className="space-y-2">
                    {aiAnalysis.deliverables_analysis.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border text-xs space-y-1 ${
                          item.satisfied
                            ? "bg-emerald-50/40 border-emerald-200 text-emerald-950"
                            : "bg-amber-50/40 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-2">
                            {item.satisfied ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            )}
                            <span>{item.deliverable}</span>
                          </div>
                          <span className="text-[10px] opacity-80">
                            Confidence: {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90 pl-6 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Checklist for Reviewer */}
                {aiAnalysis.review_checklist && aiAnalysis.review_checklist.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Recommended Reviewer Verification Checklist
                    </h4>
                    <ul className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {aiAnalysis.review_checklist.map((task, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Observations */}
                {aiAnalysis.observations && aiAnalysis.observations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Observations & Insights
                    </h4>
                    <ul className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {aiAnalysis.observations.map((obs, idx) => (
                        <li key={idx} className="text-xs text-slate-600">
                          • {obs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Provenance Transparency Breakdown */}
                {aiAnalysis.provenance_breakdown && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Evidence Provenance Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      {Object.entries(aiAnalysis.provenance_breakdown).map(([tag, facts]) => (
                        <div key={tag} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="font-bold text-slate-700 block uppercase mb-1">
                            {tag.replace(/_/g, " ")}
                          </span>
                          <span className="text-slate-500 font-semibold">{facts.length} items verified</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strict Advisory Disclaimer */}
                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl text-[11px] text-indigo-950 font-medium">
                  <span className="font-bold">Human Control & Advisory Disclaimer:</span> This AI
                  analysis is assistive and non-binding. Final approval and revision decisions remain
                  strictly with authorized human participants.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No analysis data available.</p>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close Copilot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
