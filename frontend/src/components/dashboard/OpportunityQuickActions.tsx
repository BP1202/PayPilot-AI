"use client";

import React from "react";
import { Target, Rocket, ArrowRight } from "lucide-react";
import { OpportunityIntent } from "@/types";

interface OpportunityQuickActionsProps {
  onSelectAction: (intent: OpportunityIntent) => void;
}

export const OpportunityQuickActions: React.FC<OpportunityQuickActionsProps> = ({
  onSelectAction,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Get Started</h3>
        <p className="text-xs text-slate-500 mt-0.5">Choose what you want to do:</p>
      </div>

      <div className="space-y-3">
        {/* Card 1: I need something */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">I need something</h4>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Find developers, funding, or solutions for your idea.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectAction("SEEKING_SOLUTION")}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <span>Post a Request</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card 2: I can offer something */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">I can offer something</h4>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Share your skills, ideas, or resources.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectAction("OFFERING_SOLUTION")}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
          >
            <span>Create Opportunity</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

