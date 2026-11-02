"use client";

import React, { useState } from "react";
import { Sparkles, TrendingUp, CheckCircle2, ShieldCheck, ArrowUpRight } from "lucide-react";
import { CopilotRecommendation, Transaction } from "@/types";
import { ApprovalModal } from "./ApprovalModal";

interface RecommendationCardProps {
  recommendation?: CopilotRecommendation | null;
  loading?: boolean;
  onPaymentSuccess: (captured: Transaction) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  loading,
  onPaymentSuccess,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-16 w-full bg-slate-200 rounded mb-4"></div>
        <div className="h-10 w-36 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (!recommendation) return null;

  const impact = recommendation.financial_impact;
  const action = recommendation.suggested_action;

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(val || "0"));
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 p-6 shadow-sm lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold text-slate-900">
            AI Business Copilot Recommendation
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <span className="rounded-full bg-indigo-100/80 px-2.5 py-1 text-xs font-semibold text-indigo-800 border border-indigo-200">
            Mode: {recommendation.mode}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 border border-slate-200">
            Grounded in Ledger
          </span>
        </div>
      </div>

      <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
        {recommendation.title}
      </h3>

      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        {recommendation.reasoning}
      </p>

      {/* Financial Impact Section */}
      <div className="rounded-xl border border-indigo-100 bg-white/80 p-4 mb-6 shadow-xs">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
          <span>Expected Financial Impact</span>
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Current Settled</p>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(impact.current_revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Projected Settled</p>
            <p className="text-lg font-bold text-indigo-700">
              {formatCurrency(impact.projected_revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Net Increase</p>
            <p className="text-lg font-bold text-emerald-600">
              +{formatCurrency(impact.net_change)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Working Capital Growth</p>
            <p className="text-lg font-bold text-emerald-600">
              +{parseFloat(impact.percentage_increase).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span>Explicit owner approval enforced before payment capture</span>
        </div>

        {action ? (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <span>Review & Authorize Action</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            <span>All Receivables Settled — Ledger In Sync</span>
          </div>
        )}
      </div>

      <ApprovalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        action={action || null}
        onSuccess={onPaymentSuccess}
      />
    </div>
  );
};
