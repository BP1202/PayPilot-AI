"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Code2,
  Briefcase,
  MapPin,
  Telescope,
  ArrowRight,
  Loader2,
  Sparkles,
  Search,
} from "lucide-react";
import {
  OpportunityCategory,
  OpportunityCandidate,
  OpportunityMatchesResponse,
  User,
} from "@/types";
import { fetchRecommendedOpportunities } from "@/lib/api";
import { MatchRationaleCard, getTierBadge } from "@/components/matching/MatchRationaleCard";

interface RecommendedOpportunitiesSectionProps {
  currentUser?: User | null;
  onSelectCategory: (category: OpportunityCategory) => void;
  onExploreAll?: () => void;
  onViewOpportunity?: (opportunityId: string) => void;
}

export const RecommendedOpportunitiesSection: React.FC<
  RecommendedOpportunitiesSectionProps
> = ({ currentUser, onSelectCategory, onExploreAll, onViewOpportunity }) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<OpportunityMatchesResponse | null>(null);
  const [expandedRationaleId, setExpandedRationaleId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !currentUser) {
      setMatches(null);
      return;
    }

    let isMounted = true;
    async function loadMatches() {
      setLoading(true);
      try {
        const res = await fetchRecommendedOpportunities(4);
        if (isMounted) {
          setMatches(res);
        }
      } catch {
        if (isMounted) {
          setMatches(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMatches();

    return () => {
      isMounted = false;
    };
  }, [mounted, currentUser]);

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

  const hasItems = Array.isArray(matches?.items) && matches.items.length > 0;

  return (
    <div
      data-testid="recommended-opportunities-section"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Recommended Opportunities</h3>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-600" />
            AI Network Match
          </span>
        </div>
        <button
          onClick={onExploreAll}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Explore all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500">Finding opportunities matching your profile...</p>
        </div>
      ) : hasItems ? (
        <div className="space-y-3">
          {matches!.items.map((item: OpportunityCandidate) => {
            const badge = getTierBadge(item.explanation.match_tier);
            const isRationaleOpen = expandedRationaleId === item.id;
            const isSeeking = item.intent === "SEEKING_SOLUTION";

            return (
              <div
                key={item.id}
                data-testid="opportunity-match-item"
                className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                          isSeeking
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}
                      >
                        {isSeeking ? "Seeking Solution" : "Offering Solution"}
                      </span>
                      {item.industry && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          • {item.industry}
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onViewOpportunity?.(item.id)}
                      className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition cursor-pointer"
                    >
                      {item.title}
                    </h4>
                  </div>

                  <button
                    onClick={() =>
                      setExpandedRationaleId(isRationaleOpen ? null : item.id)
                    }
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition shrink-0 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 rounded px-2 py-1 cursor-pointer"
                  >
                    {isRationaleOpen ? "Hide Rationale" : "Why Match?"}
                  </button>
                </div>

                {/* Inline Rationale if expanded */}
                {isRationaleOpen && (
                  <div className="pt-2">
                    <MatchRationaleCard explanation={item.explanation} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : mounted && currentUser ? (
        /* Authenticated but no matches / sparse profile */
        <div className="my-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
            <Search className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">
              No matching published opportunities found yet
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Add your specialized skills and services to your profile to receive
              personalized recommendations from the PayPilot opportunity network.
            </p>
          </div>
        </div>
      ) : (
        /* Guest exploration view (SSR & initial mount safe) */
        <div className="my-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
            <Telescope className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">
              Your personalized matches will appear here as the opportunity network grows.
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              PayPilot AI matches complementary seekers and providers based on verified
              capabilities and structured criteria.
            </p>
          </div>
        </div>
      )}

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
