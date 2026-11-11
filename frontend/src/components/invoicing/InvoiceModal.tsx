"use client";

import React, { useState } from "react";
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Download,
  CreditCard,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Transaction, Business, User } from "@/types";
import { downloadInvoiceFile } from "@/lib/invoiceGenerator";
import {
  createMilestonePayPalOrder,
  prepareMilestoneSettlement,
  fetchMilestoneSettlementStatus,
  approvePayment,
} from "@/lib/api";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  business?: Business | null;
  currentUser?: User | null;
  onPaymentSuccess?: (captured: Transaction) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  transaction,
  business,
  currentUser,
  onPaymentSuccess,
}) => {
  const [liveTx, setLiveTx] = useState<Transaction | null>(transaction);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Sync state if transaction prop changes
  React.useEffect(() => {
    setLiveTx(transaction);
    setPaymentError(null);
  }, [transaction]);

  if (!isOpen || !liveTx) return null;

  const isPaid = liveTx.status === "COMPLETED";
  const isMilestoneSettlement = Boolean(
    liveTx.deal_room_id && liveTx.milestone_id
  );
  const canInitiateMilestonePayment = Boolean(
    isMilestoneSettlement &&
      currentUser?.id &&
      (!liveTx.payer_user_id || liveTx.payer_user_id === currentUser.id)
  );

  const formatCurrency = (val: string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(val || "0"));
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const invoiceNumber = liveTx.transaction_ref.startsWith("TXN-")
    ? liveTx.transaction_ref.replace("TXN-", "INV-")
    : `INV-${liveTx.transaction_ref}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownload = () => {
    downloadInvoiceFile(liveTx, business, currentUser);
  };

  const handlePayInvoice = async () => {
    if (
      isMilestoneSettlement &&
      (!currentUser?.id ||
        (liveTx.payer_user_id && liveTx.payer_user_id !== currentUser.id))
    ) {
      setPaymentError("Only the designated payer can initiate this milestone payment.");
      return;
    }

    setIsPaying(true);
    setPaymentError(null);

    try {
      if (liveTx.deal_room_id && liveTx.milestone_id) {
        // Milestone PayPal checkout
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";
        const returnUrl = `${origin}/deal-rooms?room_id=${encodeURIComponent(
          liveTx.deal_room_id
        )}&milestone_id=${encodeURIComponent(
          liveTx.milestone_id
        )}&payment=return`;
        const cancelUrl = `${origin}/deal-rooms?room_id=${encodeURIComponent(
          liveTx.deal_room_id
        )}&milestone_id=${encodeURIComponent(
          liveTx.milestone_id
        )}&payment=cancelled`;

        // Confirm the signed-in user is the agreement's payer before preparing or creating an order.
        const statusRes = await fetchMilestoneSettlementStatus(
          liveTx.deal_room_id,
          liveTx.milestone_id
        );

        if (
          !currentUser?.id ||
          !statusRes.payer_user_id ||
          statusRes.payer_user_id !== currentUser.id
        ) {
          setPaymentError(
            statusRes.payer_user_id
              ? "Only the designated payer can initiate this milestone payment."
              : "We couldn't verify who is authorized to pay. Please refresh and try again."
          );
          return;
        }

        if (!statusRes.transaction_ref) {
          await prepareMilestoneSettlement(
            liveTx.deal_room_id,
            liveTx.milestone_id,
            `prep_${liveTx.milestone_id}_${Date.now()}`,
            `Milestone Settlement: ${liveTx.description || "Commercial Deliverable"}`
          );
        }

        const idempotencyKey = `ord_${liveTx.milestone_id}_${Date.now()}`;
        const orderRes = await createMilestonePayPalOrder(
          liveTx.deal_room_id,
          liveTx.milestone_id,
          idempotencyKey,
          returnUrl,
          cancelUrl
        );

        if (orderRes.approval_url) {
          window.location.href = orderRes.approval_url;
        }
      } else {
        // Direct / simulated invoice capture
        const idempotencyKey = `pay_${liveTx.transaction_ref}_${Date.now()}`;
        const captured = await approvePayment({
          transaction_ref: liveTx.transaction_ref,
          owner_approved: true,
          idempotency_key: idempotencyKey,
        });

        setLiveTx(captured);
        if (onPaymentSuccess) {
          onPaymentSuccess(captured);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      setPaymentError(
        message.toLowerCase().includes("designated payer")
          ? "Only the designated payer can initiate this milestone payment."
          : message ||
              "We couldn't start checkout. Please confirm you're the designated payer and try again."
      );
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Actions bar (hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Commercial Milestone Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Download Invoice Button */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer border border-indigo-200"
              title="Download standalone official HTML/PDF invoice file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Invoice</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              title="Print invoice or save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error alert if payment failed */}
        {paymentError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Invoice Printable Sheet */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-sm">
                  O
                </div>
                <h1
                  id="invoice-modal-title"
                  className="text-xl font-extrabold text-slate-900 tracking-tight"
                >
                  Opnly Invoice
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Official Commercial Milestone Settlement Record
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isPaid ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                <span>{isPaid ? "PAID & SETTLED" : "PENDING RELEASE"}</span>
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 pt-1">
                {invoiceNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                Issued: {formatDate(liveTx.created_at)}
              </p>
            </div>
          </div>

          {/* Pending Payment Notice Bar if unpaid */}
          {!isPaid && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-700" />
                  <span>Payment Outstanding: {formatCurrency(liveTx.amount, liveTx.currency)}</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  Deliverable approved under bilateral agreement. Authorized payer can settle immediately with PayPal.
                </p>
              </div>
              {(!isMilestoneSettlement || canInitiateMilestonePayment) && (
                <button
                  onClick={handlePayInvoice}
                  disabled={isPaying}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Pay with PayPal</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Parties: Billed From / Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Issued By (Payee)
              </p>
              <p className="font-extrabold text-slate-900">
                {currentUser?.full_name || business?.name || "Commercial Participant"}
              </p>
              <p className="text-[11px] text-slate-500">
                Opnly Verified Commercial Participant
              </p>
              {business?.country && (
                <p className="text-[11px] text-slate-400">{business.country}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Billed To (Client / Counterparty)
              </p>
              <p className="font-extrabold text-slate-900">
                {liveTx.customer_name || "Commercial Counterparty"}
              </p>
              <p className="text-[11px] text-slate-500">
                Commercial Agreement Counterparty
              </p>
              <p className="text-[11px] text-slate-400">
                {liveTx.deal_room_id
                  ? `Deal Room: ${liveTx.deal_room_id}`
                  : "Verified Deal Room Partner"}
              </p>
            </div>
          </div>

          {/* Line Item Milestone Breakdown */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Milestone Deliverable</th>
                  <th className="py-3 px-3 text-center">Stage</th>
                  <th className="py-3 px-3 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-4 px-4">
                    <p className="font-bold text-slate-900">
                      {liveTx.description || "Core Architecture & Milestone Deliverables"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Grounded acceptance of agreed milestone scope & evidence submission.
                    </p>
                  </td>
                  <td className="py-4 px-3 text-center font-mono">1</td>
                  <td className="py-4 px-3 text-right font-mono">
                    {formatCurrency(liveTx.amount, liveTx.currency)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(liveTx.amount, liveTx.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Financial Summary Calculation */}
            <div className="bg-slate-50/70 p-4 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(liveTx.amount, liveTx.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Opnly Direct Settlement Fee (0%)</span>
                <span className="font-mono">$0.00</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Total Settled Amount</span>
                <span className="font-mono text-indigo-700">
                  {formatCurrency(liveTx.amount, liveTx.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Provenance & Audit Trail */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3 text-xs">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-indigo-950">
                Verified Payment Provenance & Ledger Sync
              </p>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                Payment Rail: <strong>{liveTx.payment_method}</strong> · Transaction Reference:{" "}
                <span className="font-mono">{liveTx.transaction_ref}</span>.
                {liveTx.paypal_capture_id && (
                  <> · PayPal Capture ID: <span className="font-mono">{liveTx.paypal_capture_id}</span></>
                )}
                Verified against the Opnly Commerce Ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer (hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 print:hidden">
          <p className="text-[11px] text-slate-400">
            Official commercial invoice for tax & milestone accounting.
          </p>
          <div className="flex items-center gap-2">
            {!isPaid && (!isMilestoneSettlement || canInitiateMilestonePayment) && (
              <button
                onClick={handlePayInvoice}
                disabled={isPaying}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Pay with PayPal ({formatCurrency(liveTx.amount, liveTx.currency)})</span>
                  </>
                )}
              </button>
            )}
            {!isPaid && isMilestoneSettlement && !canInitiateMilestonePayment && (
              <p className="text-[11px] text-slate-500">
                Only the designated payer can initiate this milestone payment.
              </p>
            )}
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
