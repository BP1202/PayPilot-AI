"use client";

import React, { useState } from "react";
import {
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  FileText,
  CreditCard,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Transaction, TransactionStatus, Business, User } from "@/types";
import { InvoiceModal } from "./invoicing/InvoiceModal";
import { downloadInvoiceFile } from "@/lib/invoiceGenerator";

interface CommerceLedgerProps {
  transactions: Transaction[];
  loading?: boolean;
  error?: string | null;
  selectedStatus?: TransactionStatus | undefined;
  onFilterChange: (status?: TransactionStatus) => void;
  business?: Business | null;
  currentUser?: User | null;
  onPaymentSuccess?: (captured: Transaction) => void;
}

export const CommerceLedger: React.FC<CommerceLedgerProps> = ({
  transactions,
  loading,
  error,
  selectedStatus,
  onFilterChange,
  business,
  currentUser,
  onPaymentSuccess,
}) => {
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<Transaction | null>(null);

  const formatCurrency = (val: string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(val || "0"));
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const handleInvoicePaymentSuccess = (captured: Transaction) => {
    setSelectedInvoiceTx(captured);
    if (onPaymentSuccess) {
      onPaymentSuccess(captured);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {currentUser?.id === "demo_org_northstar"
              ? "Jordan Lee — Settlements & Expenditures"
              : currentUser?.id === "demo_solver_priya"
              ? "Priya Nair — Earnings & Received Payouts"
              : currentUser
              ? `${currentUser.name || currentUser.full_name || "Account"} Ledger & Invoices`
              : "Milestone Payouts & Invoices"}
          </h2>
          <p className="text-xs text-slate-500">
            {currentUser?.id === "demo_org_northstar"
              ? "Track your business settlements and contractor payments authorized to Priya Nair via PayPal"
              : currentUser?.id === "demo_solver_priya"
              ? "Track your verified contractor earnings and milestone payouts received from Jordan Lee"
              : "Verified commercial milestone settlements, received earnings, and downloadable invoices"}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => onFilterChange(undefined)}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                selectedStatus === undefined
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => onFilterChange("COMPLETED")}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                selectedStatus === "COMPLETED"
                  ? "bg-white text-emerald-800 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => onFilterChange("PENDING")}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                selectedStatus === "PENDING"
                  ? "bg-white text-amber-800 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-medium">
              <th className="pb-3 pl-1 font-semibold">Reference</th>
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold">Flow</th>
              <th className="pb-3 font-semibold">Parties & Description</th>
              <th className="pb-3 font-semibold">Payment Rail</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Amount</th>
              <th className="pb-3 pr-1 text-right font-semibold">Actions & Invoices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 pl-1"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-44 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                  <td className="py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="py-4 pr-1 text-right"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  We couldn&apos;t load your transaction history right now. Please check your connection and try again.
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  {selectedStatus
                    ? "No transactions match the selected filter."
                    : "Commercial settlements appear here after milestone deliverables are verified and payment is captured."}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isPayer = Boolean(currentUser?.id && tx.payer_user_id === currentUser.id);
                const isPayee = Boolean(currentUser?.id && tx.payee_user_id === currentUser.id);

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1 font-mono font-medium text-slate-900">
                      {tx.transaction_ref}
                    </td>
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                    <td className="py-3.5">
                      {isPayer ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                          <ArrowUpRight className="h-3 w-3" />
                          <span>Outgoing</span>
                        </span>
                      ) : isPayee ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <ArrowDownLeft className="h-3 w-3" />
                          <span>Incoming</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          <span>Settlement</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 max-w-xs">
                      {isPayer ? (
                        <div>
                          <p className="font-semibold text-slate-900">
                            Paid to: <span className="text-purple-900">{tx.payee_name || "Contractor / Priya Nair"}</span>
                          </p>
                          <p className="text-slate-500 truncate text-[11px]">
                            {tx.description || "Milestone deliverable settlement"}
                          </p>
                        </div>
                      ) : isPayee ? (
                        <div>
                          <p className="font-semibold text-slate-900">
                            Received from: <span className="text-emerald-900">{tx.payer_name || tx.customer_name || "Client / Jordan Lee"}</span>
                          </p>
                          <p className="text-slate-500 truncate text-[11px]">
                            {tx.description || "Milestone contractor payout"}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-900">
                            {tx.payer_name ? (
                              <>
                                <span>{tx.payer_name}</span>
                                <span className="text-slate-400 mx-1">→</span>
                                <span>{tx.payee_name || tx.customer_name || "Payee"}</span>
                              </>
                            ) : (
                              <span>{tx.customer_name || "Commercial Partner"}</span>
                            )}
                          </p>
                          <p className="text-slate-500 truncate text-[11px]">{tx.description || "Commercial Settlement"}</p>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {tx.status === "COMPLETED" ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          <span>Completed</span>
                        </span>
                      ) : tx.status === "PENDING" ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 border border-red-200">
                          <AlertCircle className="h-3 w-3" />
                          <span>{tx.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold">
                      {isPayer ? (
                        <span className="text-purple-900">
                          -{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      ) : isPayee ? (
                        <span className="text-emerald-700">
                          +{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-900">
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      )}
                    </td>
                  <td className="py-3.5 pr-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Direct Pay Now button for pending transactions */}
                      {tx.status === "PENDING" &&
                        (!tx.deal_room_id ||
                          !tx.milestone_id ||
                          (currentUser?.id &&
                            (!tx.payer_user_id ||
                              tx.payer_user_id === currentUser.id))) && (
                        <button
                          onClick={() => setSelectedInvoiceTx(tx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                          title="Directly settle and pay this invoice with PayPal"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>Pay Now</span>
                        </button>
                      )}

                      {/* View Invoice button */}
                      <button
                        onClick={() => setSelectedInvoiceTx(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition cursor-pointer"
                        title="View Official Commercial Invoice"
                        aria-label={`View invoice for ${tx.transaction_ref}`}
                      >
                        <Receipt className="h-3 w-3" />
                        <span>Invoice</span>
                      </button>

                      {/* One-click direct Download Invoice button */}
                      <button
                        onClick={() => downloadInvoiceFile(tx, business, currentUser)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                        title="Download official standalone HTML/PDF invoice file"
                        aria-label={`Download invoice for ${tx.transaction_ref}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoiceTx)}
        onClose={() => setSelectedInvoiceTx(null)}
        transaction={selectedInvoiceTx}
        business={business}
        currentUser={currentUser}
        onPaymentSuccess={handleInvoicePaymentSuccess}
      />
    </div>
  );
};
