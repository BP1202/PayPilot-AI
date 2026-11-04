"use client";

import React from "react";
import { Clock, ArrowRight, Sparkles } from "lucide-react";
import { Opportunity } from "@/types";

interface RecentActivitySectionProps {
  opportunities: Opportunity[];
  onSelectOpportunity?: (opportunity: Opportunity) => void;
  onSeeAll?: () => void;
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  opportunities,
  onSelectOpportunity,
  onSeeAll,
}) => {
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Just now";
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "1 day ago";
      return `${diffDays} days ago`;
    } catch {
      return "Recently";
    }
  };

  const recentOpps = opportunities.slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
        </div>
        <button
          onClick={onSeeAll}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 cursor-pointer"
        >
          <span>See all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {recentOpps.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No recent activity. Capture or explore an opportunity to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {recentOpps.map((opp) => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity && onSelectOpportunity(opp)}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="mt-0.5 h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-700 leading-snug">
                  You created a new opportunity:{" "}
                  <span className="font-bold text-slate-900">&ldquo;{opp.title}&rdquo;</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatTimeAgo(opp.updated_at || opp.created_at)} ·{" "}
                  <span className="font-semibold text-indigo-600">{opp.category}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
