"use client";

import React from "react";
import {
  Sparkles,
  CreditCard,
  Code2,
  Briefcase,
  MapPin,
  Telescope,
  ArrowRight,
} from "lucide-react";
import { OpportunityCategory } from "@/types";

interface RecommendedOpportunitiesSectionProps {
  onSelectCategory: (category: OpportunityCategory) => void;
  onExploreAll?: () => void;
}

export const RecommendedOpportunitiesSection: React.FC<RecommendedOpportunitiesSectionProps> = ({
  onSelectCategory,
  onExploreAll,
}) => {
  const categories: Array<{
    key: OpportunityCategory;
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
  }> = [
    { key: "FINTECH", label: "Fintech", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    { key: "TECH", label: "Tech", icon: Code2, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
    { key: "BUSINESS", label: "Business", icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    { key: "LOCAL", label: "Local", icon: MapPin, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Recommended Opportunities</h3>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
            Network Matches
          </span>
        </div>
        <button
          onClick={onExploreAll}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 cursor-pointer"
        >
          <span>See all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Honest Empty State with Telescope Illustration */}
      <div className="my-6 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
          <Telescope className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-800">
            Your personalized matches will appear here as the opportunity network grows.
          </p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            PayPilot AI matches complementary seekers and providers based on verified capabilities and structured criteria.
          </p>
        </div>
      </div>

      {/* Categories Shortcuts */}
      <div className="pt-3 border-t border-slate-100">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2.5">
          Explore Categories
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => onSelectCategory(cat.key)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border ${cat.bg} p-2 text-xs font-bold text-slate-700 hover:opacity-90 hover:shadow-2xs transition cursor-pointer`}
              >
                <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

