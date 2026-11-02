"use client";

import React, { useState } from "react";
import { Filter, ArrowUpDown, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Transaction, TransactionStatus } from "@/types";

interface CommerceLedgerProps {
  transactions: Transaction[];
  loading?: boolean;
  selectedStatus?: TransactionStatus | undefined;
  onFilterChange: (status?: TransactionStatus) => void;
}

export const CommerceLedger: React.FC<CommerceLedgerProps> = ({
  transactions,
  loading,
  selectedStatus,
  onFilterChange,
}) => {
  const formatCurrency = (val: string, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Commerce Ledger</h2>
          <p className="text-xs text-slate-500">
            Real-time verified transaction history and payment records
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => onFilterChange(undefined)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                selectedStatus === undefined
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => onFilterChange("COMPLETED")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                selectedStatus === "COMPLETED"
                  ? "bg-white text-emerald-800 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => onFilterChange("PENDING")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
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
              <th className="pb-3 font-semibold">Customer & Description</th>
              <th className="pb-3 font-semibold">Payment Rail</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 pr-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 pl-1"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-48 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                  <td className="py-4 pr-1 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No transactions match the selected filter.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pl-1 font-mono font-medium text-slate-900">
                    {tx.transaction_ref}
                  </td>
                  <td className="py-3.5 text-slate-500">{formatDate(tx.created_at)}</td>
                  <td className="py-3.5 max-w-xs">
                    <p className="font-semibold text-slate-900">{tx.customer_name || "Direct Customer"}</p>
                    <p className="text-slate-500 truncate text-[11px]">{tx.description || "Customer Payment"}</p>
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
                  <td className="py-3.5 pr-1 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(tx.amount, tx.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

