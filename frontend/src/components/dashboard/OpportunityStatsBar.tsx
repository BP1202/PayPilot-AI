"use client";

import React from "react";
import { Lightbulb, Search, Handshake, FileText, ArrowRight } from "lucide-react";
import { Opportunity } from "@/types";

interface OpportunityStatsBarProps {
  opportunities: Opportunity[];
  loading?: boolean;
  onFilterIntent?: (intent?: "SEEKING_SOLUTION" | "OFFERING_SOLUTION") => void;
  onViewAll?: () => void;
}

export const OpportunityStatsBar: React.FC<OpportunityStatsBarProps> = ({
  opportunities,
  loading,
  onFilterIntent,
  onViewAll,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalCount = opportunities.length;
  const seekingCount = opportunities.filter((o) => o.intent === "SEEKING_SOLUTION").length;
  const offeringCount = opportunities.filter((o) => o.intent === "OFFERING_SOLUTION").length;
  const draftsCount = opportunities.filter((o) => o.status === "DRAFT" || o.status === "ANALYSED").length;

  const stats = [
    {
      title: "My Opportunities",
      count: totalCount,
      icon: Lightbulb,
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
      action: "View all →",
      onClick: onViewAll,
    },
    {
      title: "Seeking Opportunities",
      count: seekingCount,
      icon: Search,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
      action: "View all →",
      onClick: () => onFilterIntent && onFilterIntent("SEEKING_SOLUTION"),
    },
    {
      title: "Offering Opportunities",
      count: offeringCount,
      icon: Handshake,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-100",
      action: "View all →",
      onClick: () => onFilterIntent && onFilterIntent("OFFERING_SOLUTION"),
    },
    {
      title: "Drafts",
      count: draftsCount,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-100",
      action: "Continue →",
      onClick: onViewAll,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-xs font-bold text-slate-700">{stat.title}</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 pl-1">{stat.count}</p>
              <button
                type="button"
                onClick={stat.onClick}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition pl-1 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{stat.action}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

