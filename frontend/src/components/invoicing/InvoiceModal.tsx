"use client";

import React from "react";
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Download,
  Calendar,
  Layers,
} from "lucide-react";
import { Transaction, Business, User } from "@/types";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  business?: Business | null;
  currentUser?: User | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  transaction,
  business,
  currentUser,
}) => {
  if (!isOpen || !transaction) return null;

  const isPaid = transaction.status === "COMPLETED";

  const formatCurrency = (val: string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
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

  const invoiceNumber = transaction.transaction_ref.startsWith("TXN-")
    ? transaction.transaction_ref.replace("TXN-", "INV-")
    : `INV-${transaction.transaction_ref}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Commercial Milestone Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-sm">
                  O
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
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
                {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                <span>{isPaid ? "PAID & SETTLED" : "PENDING RELEASE"}</span>
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 pt-1">
                {invoiceNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                Issued: {formatDate(transaction.created_at)}
              </p>
            </div>
          </div>

          {/* Parties: Billed From / Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Issued By (Payee)
              </p>
              <p className="font-extrabold text-slate-900">
                {currentUser?.full_name || business?.name || "Alice Architect"}
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
                {transaction.customer_name || "Stratos Dynamics"}
              </p>
              <p className="text-[11px] text-slate-500">
                Commercial Agreement Counterparty
              </p>
              <p className="text-[11px] text-slate-400">Verified Deal Room Partner</p>
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
                      {transaction.description || "Core Architecture & Milestone Deliverables"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Grounded acceptance of agreed milestone scope & evidence submission.
                    </p>
                  </td>
                  <td className="py-4 px-3 text-center font-mono">1</td>
                  <td className="py-4 px-3 text-right font-mono">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Financial Summary Calculation */}
            <div className="bg-slate-50/70 p-4 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(transaction.amount, transaction.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Opnly Direct Settlement Fee (0%)</span>
                <span className="font-mono">$0.00</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Total Settled Amount</span>
                <span className="font-mono text-indigo-700">
                  {formatCurrency(transaction.amount, transaction.currency)}
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
                Payment Rail: <strong>{transaction.payment_method}</strong> · Transaction Reference:{" "}
                <span className="font-mono">{transaction.transaction_ref}</span>. Verified against the Opnly Commerce Ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer (hidden in print) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 print:hidden">
          <p className="text-[11px] text-slate-400">
            Official commercial invoice for tax & milestone accounting.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

