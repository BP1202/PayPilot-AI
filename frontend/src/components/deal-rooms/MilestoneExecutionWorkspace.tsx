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
  Transaction,
} from "@/types";
import {
  initializeDealRoomMilestones,
  fetchDealRoomMilestones,
  startMilestoneWork,
  submitMilestoneEvidence,
  reviewMilestoneEvidence,
  cancelDealRoomMilestone,
  analyzeMilestoneAI,
  createMilestonePayPalOrder,
  captureMilestonePayPalOrder,
  fetchMilestoneSettlementStatus,
  prepareMilestoneSettlement,
  fetchLedgerTransactions,
} from "@/lib/api";
import { InvoiceModal } from "@/components/invoicing/InvoiceModal";
import { downloadInvoiceFile } from "@/lib/invoiceGenerator";
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
  CreditCard,
  Loader2,
  Lock,
  ArrowRight,
  Download,
} from "lucide-react";

interface MilestoneExecutionWorkspaceProps {
  roomId: string;
  currentUser: User | null;
  agreedMilestones: DealRoomMilestoneItem[];
  currency: string;
  onMilestoneUpdated?: () => void;
}

interface PaymentState {
  status: "idle" | "creating_order" | "awaiting_approval" | "capturing" | "completed" | "failed" | "cancelled";
  orderId?: string;
  captureId?: string;
  approvalUrl?: string;
  amount?: string;
  currency?: string;
  message?: string;
  error?: string;
  transactionRef?: string;
}

export function MilestoneExecutionWorkspace({
  roomId,
  currentUser,
  agreedMilestones,
  currency,
  onMilestoneUpdated,
}: MilestoneExecutionWorkspaceProps) {
  const [milestonesData, setMilestonesData] = useState<MilestoneListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Active Actions
  const [activeMilestone, setActiveMilestone] = useState<MilestoneExecution | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // PayPal Settlement & Payment State
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});
  const [paymentNotice, setPaymentNotice] = useState<{
    type: "success" | "info" | "warning" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<Transaction | null>(null);
  const [invoiceLoadingMilestoneId, setInvoiceLoadingMilestoneId] = useState<string | null>(null);

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

  // Load existing settlement state for approved milestones
  const loadSettlementStatuses = useCallback(async (milestones: MilestoneExecution[]) => {
    const approvedReady = milestones.filter(
      (m) => m.status === "APPROVED" && (m.payment_readiness === "READY_FOR_PAYMENT_REVIEW" || m.payment_readiness === "PAID")
    );
    for (const m of approvedReady) {
      try {
        const statusRes = await fetchMilestoneSettlementStatus(roomId, m.id);
        if (statusRes) {
          setPaymentStates((prev) => ({
            ...prev,
            [m.id]: {
              status: statusRes.status === "COMPLETED"
                ? "completed"
                : statusRes.status === "AWAITING_APPROVAL"
                ? "awaiting_approval"
                : "idle",
              orderId: statusRes.paypal_order_id || undefined,
              captureId: statusRes.paypal_capture_id || undefined,
              transactionRef: statusRes.transaction_ref || undefined,
              approvalUrl: statusRes.approval_url || undefined,
              amount: statusRes.agreed_amount || undefined,
              currency: statusRes.currency,
            },
          }));
        }
      } catch {
        // Safe graceful degradation if settlement endpoint isn't ready
      }
    }
  }, [roomId]);

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDealRoomMilestones(roomId);
      setMilestonesData(res);
      if (res && res.items) {
        loadSettlementStatuses(res.items);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load milestones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [roomId, loadSettlementStatuses]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  // Handle server-side PayPal Capture
  const handleCapturePayPalOrder = useCallback(async (milestoneId: string) => {
    setPaymentLoadingId(milestoneId);
    setPaymentStates((prev) => ({
      ...prev,
      [milestoneId]: {
        ...(prev[milestoneId] || { status: "capturing" }),
        status: "capturing",
        message: "Verifying buyer approval and capturing payment via PayPal API...",
      },
    }));

    try {
      const captureIdemp = `cap_${milestoneId}_${Date.now()}`;
      const captureRes = await captureMilestonePayPalOrder(roomId, milestoneId, captureIdemp);

      setPaymentStates((prev) => ({
        ...prev,
        [milestoneId]: {
          status: "completed",
          orderId: captureRes.paypal_order_id,
          captureId: captureRes.paypal_capture_id,
          transactionRef: captureRes.transaction_ref,
          amount: captureRes.amount,
          currency: captureRes.currency,
          message: `Verified capture completed! Payment settled (${captureRes.currency} ${captureRes.amount}).`,
        },
      }));

      setPaymentNotice({
        type: "success",
        title: "PayPal Payment Completed!",
        message: `Verified capture ID ${captureRes.paypal_capture_id} confirmed by PayPal Sandbox. Transaction ${captureRes.transaction_ref} is COMPLETED.`,
      });

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("opnly_pending_paypal");
      }

      await loadMilestones();
    } catch (err: any) {
      const errorMsg = err?.message || "Server-side PayPal capture verification failed.";
      setPaymentStates((prev) => ({
        ...prev,
        [milestoneId]: {
          ...(prev[milestoneId] || {}),
          status: "failed",
          error: errorMsg,
        },
      }));
      setPaymentNotice({
        type: "error",
        title: "Payment Capture Failed",
        message: errorMsg,
      });
    } finally {
      setPaymentLoadingId(null);
    }
  }, [roomId, loadMilestones]);

  const loadVerifiedInvoiceTransaction = async (
    milestone: MilestoneExecution
  ): Promise<Transaction | null> => {
    const paymentState = paymentStates[milestone.id];
    if (!paymentState?.transactionRef || !paymentState.captureId) {
      setPaymentNotice({
        type: "warning",
        title: "Invoice not available yet",
        message: "The verified transaction details are still loading. Please try again shortly.",
      });
      return null;
    }

    setInvoiceLoadingMilestoneId(milestone.id);
    try {
      const ledger = await fetchLedgerTransactions();
      const transaction = ledger.items.find(
        (item) =>
          item.transaction_ref === paymentState.transactionRef &&
          item.status === "COMPLETED" &&
          item.paypal_capture_id === paymentState.captureId &&
          item.deal_room_id === roomId &&
          item.milestone_id === milestone.id
      );
      if (!transaction) {
        setPaymentNotice({
          type: "warning",
          title: "Invoice not available yet",
          message: "We couldn't find the verified settlement record for this milestone. Please try again later.",
        });
        return null;
      }
      return transaction;
    } catch (err: unknown) {
      setPaymentNotice({
        type: "error",
        title: "Unable to load invoice",
        message: err instanceof Error
          ? err.message
          : "We couldn't load the verified invoice right now. Please try again.",
      });
      return null;
    } finally {
      setInvoiceLoadingMilestoneId(null);
    }
  };

  const handleViewInvoice = async (milestone: MilestoneExecution) => {
    const transaction = await loadVerifiedInvoiceTransaction(milestone);
    if (transaction) {
      setSelectedInvoiceTx(transaction);
    }
  };

  const handleDownloadInvoice = async (milestone: MilestoneExecution) => {
    const transaction = await loadVerifiedInvoiceTransaction(milestone);
    if (transaction) {
      const payee = transaction.payee_user_id === currentUser?.id ? currentUser : null;
      downloadInvoiceFile(transaction, null, payee);
    }
  };

  // Handle PayPal return and cancel URL detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paymentAction = params.get("payment");
    const returnMilestoneId = params.get("milestone_id");

    if (paymentAction === "cancelled") {
      setPaymentNotice({
        type: "warning",
        title: "PayPal Payment Cancelled",
        message: "Checkout was cancelled. No funds were charged. You can retry payment whenever you are ready.",
      });
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("payment");
      newUrl.searchParams.delete("token");
      newUrl.searchParams.delete("PayerID");
      window.history.replaceState({}, "", newUrl.toString());
    } else if (paymentAction === "return" && returnMilestoneId) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("payment");
      newUrl.searchParams.delete("token");
      newUrl.searchParams.delete("PayerID");
      window.history.replaceState({}, "", newUrl.toString());

      handleCapturePayPalOrder(returnMilestoneId);
    }
  }, [roomId, handleCapturePayPalOrder]);

  // Handle Pay with PayPal (Create Order & Redirect)
  const handlePayWithPayPal = async (milestone: MilestoneExecution) => {
    const isPayer = currentUser && (
      milestone.payer_user_id
        ? milestone.payer_user_id === currentUser.id
        : (milestone.reviewer_user?.user_id === currentUser.id || milestone.reviewer_user?.id === currentUser.id)
    );

    if (!isPayer) {
      setPaymentNotice({
        type: "error",
        title: "Unauthorized Action",
        message: `Only the designated client / payer (${milestone.reviewer_user?.name || milestone.reviewer_user?.full_name || "Client"}) is contractually authorized to initiate PayPal payments under the accepted agreement.`,
      });
      return;
    }

    if (milestone.payment_readiness !== "READY_FOR_PAYMENT_REVIEW") {
      setPaymentNotice({
        type: "warning",
        title: "Payment Unavailable",
        message: "This milestone is not currently eligible for payment review. Deliverables must be approved first.",
      });
      return;
    }

    const idempotencyKey = `ord_${milestone.id}_${Date.now()}`;
    setPaymentLoadingId(milestone.id);
    setPaymentStates((prev) => ({
      ...prev,
      [milestone.id]: {
        status: "creating_order",
        message: "Creating PayPal Sandbox order...",
      },
    }));

    try {
      // Automatically ensure commercial settlement transaction is prepared first if not yet created
      const currentSettlement = paymentStates[milestone.id];
      if (!currentSettlement?.orderId) {
        try {
          const prepRes = prepareMilestoneSettlement(
            roomId,
            milestone.id,
            `prep_${milestone.id}_${Date.now()}`,
            `Milestone Settlement: ${milestone.title}`
          );
          if (prepRes && typeof (prepRes as any).then === "function") {
            await prepRes;
          }
        } catch (prepErr) {
          // If already prepared concurrently, continue safely
          console.warn("Settlement preparation note:", prepErr);
        }
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const returnUrl = `${origin}/deal-rooms?room_id=${encodeURIComponent(roomId)}&milestone_id=${encodeURIComponent(milestone.id)}&payment=return`;
      const cancelUrl = `${origin}/deal-rooms?room_id=${encodeURIComponent(roomId)}&milestone_id=${encodeURIComponent(milestone.id)}&payment=cancelled`;

      const orderRes = await createMilestonePayPalOrder(
        roomId,
        milestone.id,
        idempotencyKey,
        returnUrl,
        cancelUrl
      );

      setPaymentStates((prev) => ({
        ...prev,
        [milestone.id]: {
          status: "awaiting_approval",
          orderId: orderRes.paypal_order_id,
          approvalUrl: orderRes.approval_url,
          amount: orderRes.amount,
          currency: orderRes.currency,
          message: "PayPal Sandbox order created! Redirecting to PayPal for buyer approval...",
        },
      }));

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "opnly_pending_paypal",
          JSON.stringify({
            roomId,
            milestoneId: milestone.id,
            orderId: orderRes.paypal_order_id,
            idempotencyKey,
          })
        );
      }

      if (orderRes.approval_url) {
        window.location.href = orderRes.approval_url;
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to create PayPal Sandbox order.";
      if (errorMsg.includes("already completed")) {
        setPaymentStates((prev) => ({
          ...prev,
          [milestone.id]: {
            status: "completed",
            message: "Milestone settlement is already completed and verified.",
          },
        }));
        setPaymentNotice({
          type: "success",
          title: "Payment Already Completed",
          message: errorMsg,
        });
        onMilestoneUpdated?.();
      } else {
        setPaymentStates((prev) => ({
          ...prev,
          [milestone.id]: {
            status: "failed",
            error: errorMsg,
          },
        }));
        setPaymentNotice({
          type: "error",
          title: "PayPal Order Creation Failed",
          message: errorMsg,
        });
      }
    } finally {
      setPaymentLoadingId(null);
    }
  };

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
      {/* PayPal Settlement Global Notice */}
      {paymentNotice && (
        <div
          className={`rounded-2xl p-4 text-xs border flex items-start justify-between gap-3 ${
            paymentNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : paymentNotice.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-950"
              : paymentNotice.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-950"
              : "bg-indigo-50 border-indigo-200 text-indigo-950"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {paymentNotice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : paymentNotice.type === "warning" ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            ) : paymentNotice.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold">{paymentNotice.title}</p>
              <p className="text-[11px] mt-0.5 leading-relaxed">{paymentNotice.message}</p>
            </div>
          </div>
          <button
            onClick={() => setPaymentNotice(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
              const isResponsible = currentUser?.id === milestone.responsible_user?.user_id || currentUser?.id === milestone.responsible_user?.id;
              const isReviewer = currentUser?.id === milestone.reviewer_user?.user_id || currentUser?.id === milestone.reviewer_user?.id;
              const isPayer = currentUser && (
                milestone.payer_user_id
                  ? milestone.payer_user_id === currentUser.id
                  : (milestone.reviewer_user?.user_id === currentUser.id || milestone.reviewer_user?.id === currentUser.id)
              );
              const hasEvidence = !!milestone.current_evidence_submission;
              const formattedMilestoneAmount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: milestone.currency,
              }).format(Number(milestone.agreed_amount || "0"));

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

                  {milestone.status === "SUBMITTED_FOR_REVIEW" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      Deliverable evidence submitted. Awaiting client review and approval before payment release.
                    </div>
                  )}

                  {/* Commercial Settlement & PayPal Sandbox Payment Card */}
                  {milestone.status === "APPROVED" ? (
                    milestone.payment_readiness === "PAID" ? (
                      <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-bold flex items-center gap-2">
                            <span>Payment Verified & Settled via PayPal Sandbox</span>
                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 font-semibold">
                              PAID
                            </span>
                          </p>
                          <p className="text-[11px] text-emerald-800 leading-relaxed">
                            Commercial settlement verified. Payment of {formattedMilestoneAmount} captured via PayPal Sandbox Orders v2.
                          </p>
                          {paymentStates[milestone.id]?.transactionRef && (
                            <p className="text-[10px] font-mono text-emerald-700 mt-1">
                              Transaction Reference: {paymentStates[milestone.id].transactionRef}
                            </p>
                          )}
                          {paymentStates[milestone.id]?.captureId && (
                            <p className="text-[10px] font-mono text-emerald-700 mt-1">
                              PayPal Capture ID: {paymentStates[milestone.id].captureId}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(milestone)}
                              disabled={invoiceLoadingMilestoneId === milestone.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>View Invoice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(milestone)}
                              disabled={invoiceLoadingMilestoneId === milestone.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download Invoice</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white p-5 text-xs shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                Payment Readiness: Ready for Payment Review
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Deliverables approved by designated reviewer. Authorized payer can proceed to payment.
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-slate-900">
                              {formattedMilestoneAmount}
                            </span>
                            <span className="text-xs text-slate-500 ml-1 font-semibold">{milestone.currency}</span>
                          </div>
                        </div>

                        {/* Agreement Parties Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-slate-200/80 text-[11px]">
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                              Designated Payer (Client)
                            </span>
                            <span className="font-bold text-slate-800">
                              {milestone.reviewer_user?.name || milestone.reviewer_user?.full_name || "Client"}
                            </span>
                            <span className="text-slate-400 block text-[10px]">
                              {milestone.reviewer_user?.email}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                              Designated Payee (Worker)
                            </span>
                            <span className="font-bold text-slate-800">
                              {milestone.responsible_user?.name || milestone.responsible_user?.full_name || "Solver"}
                            </span>
                            <span className="text-slate-400 block text-[10px]">
                              {milestone.responsible_user?.email}
                            </span>
                          </div>
                        </div>

                        {/* Payment Actions & States */}
                        {paymentStates[milestone.id]?.status === "creating_order" ? (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-100/60 text-indigo-900 text-xs font-medium">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            <span>Creating PayPal Sandbox Orders v2 transaction...</span>
                          </div>
                        ) : paymentStates[milestone.id]?.status === "capturing" ? (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-100/60 text-indigo-900 text-xs font-medium">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            <span>Verifying buyer authorization and capturing payment via PayPal API...</span>
                          </div>
                        ) : paymentStates[milestone.id]?.status === "awaiting_approval" ? (
                          <div className="space-y-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-amber-600" />
                                <span>PayPal Order Created — Awaiting Buyer Authorization</span>
                              </p>
                              {paymentStates[milestone.id]?.orderId && (
                                <span className="font-mono text-[10px] bg-amber-100 px-2 py-0.5 rounded font-semibold text-amber-900">
                                  Order ID: {paymentStates[milestone.id].orderId}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-amber-800">
                              Order is active in PayPal Sandbox. Complete authorization or verify capture below.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {paymentStates[milestone.id]?.approvalUrl && (
                                <a
                                  href={paymentStates[milestone.id].approvalUrl}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  <span>Complete PayPal Approval</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => handleCapturePayPalOrder(milestone.id)}
                                disabled={actionLoading || paymentLoadingId === milestone.id}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Verify & Capture Payment</span>
                              </button>
                            </div>
                          </div>
                        ) : paymentStates[milestone.id]?.status === "failed" ? (
                          <div className="space-y-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                            <p className="font-bold text-xs flex items-center gap-1.5">
                              <AlertCircle className="h-4 w-4 text-rose-600" />
                              <span>Payment Initiation Error</span>
                            </p>
                            <p className="text-[11px] text-rose-800">{paymentStates[milestone.id].error}</p>
                            {isPayer && (
                              <button
                                onClick={() => handlePayWithPayPal(milestone)}
                                disabled={actionLoading || paymentLoadingId === milestone.id}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span>Retry Pay with PayPal</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                            {isPayer ? (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handlePayWithPayPal(milestone)}
                                  disabled={actionLoading || paymentLoadingId === milestone.id}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                                >
                                  <CreditCard className="h-4 w-4" />
                                  <span>Pay with PayPal (Sandbox)</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Pay {formattedMilestoneAmount}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>
                                  Milestone approved. Waiting for client payment release.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl p-3 bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Payment Unavailable: Deliverables must be submitted by the solver and approved by the reviewer before commercial payment.
                      </span>
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

                      {/* Pay with PayPal Button (Approved & Ready for Payment Review) */}
                      {milestone.status === "APPROVED" && milestone.payment_readiness === "READY_FOR_PAYMENT_REVIEW" && (
                        <>
                          {isPayer ? (
                            <button
                              onClick={() => handlePayWithPayPal(milestone)}
                              disabled={actionLoading || paymentLoadingId === milestone.id}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Pay with PayPal (Sandbox)</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              Waiting for client payment ({milestone.reviewer_user?.name || milestone.reviewer_user?.full_name || "Client"})
                            </span>
                          )}
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
      <InvoiceModal
        isOpen={Boolean(selectedInvoiceTx)}
        onClose={() => setSelectedInvoiceTx(null)}
        transaction={selectedInvoiceTx}
        currentUser={
          selectedInvoiceTx?.payee_user_id === currentUser?.id ? currentUser : null
        }
      />
    </div>
  );
}
