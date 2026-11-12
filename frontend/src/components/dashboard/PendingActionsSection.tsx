"use client";

import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface PendingActionsSectionProps {
  onSeeAll?: () => void;
}

export const PendingActionsSection: React.FC<PendingActionsSectionProps> = ({ onSeeAll }) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-900">Pending Actions</h3>
        <button
          onClick={onSeeAll}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-0.5 cursor-pointer"
        >
          <span>See all</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="py-4 text-center space-y-1.5">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <p className="text-xs font-bold text-slate-800">No pending actions</p>
        <p className="text-[11px] text-slate-400">You&apos;re all caught up!</p>
      </div>
    </div>
  );
};
