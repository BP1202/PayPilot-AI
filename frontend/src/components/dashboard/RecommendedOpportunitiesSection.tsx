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
  DollarSign,
  Tag,
} from "lucide-react";
import {
  OpportunityCategory,
  OpportunityCandidate,
  OpportunityMatchesResponse,
  OpportunityPublic,
  User,
} from "@/types";
import {
  fetchRecommendedOpportunities,
  fetchPublishedOpportunities,
} from "@/lib/api";
import { MatchRationaleCard, getTierBadge } from "@/components/matching/MatchRationaleCard";

interface RecommendedOpportunitiesSectionProps {
  currentUser?: User | null;
  onSelectCategory: (category: OpportunityCategory) => void;
  onExploreAll?: () => void;
  onViewOpportunity?: (opportunityId: string) => void;
  onQuickIntent?: (intent: string) => void;
}

const DEMO_OPPORTUNITIES = [
  {
    id: "demo-opp-1",
    title: "AI Automated Financial Reconciliation Engine",
    intent: "SEEKING_SOLUTION",
    category: "FINTECH" as OpportunityCategory,
    location: "Remote",
    budget: "$8,500",
    skills: ["FastAPI", "Next.js", "Payment APIs"],
    matchScore: 96,
    summary: "Seeking a senior backend engineer to build real-time ledger settlement and dual-entry reconciliation.",
  },
  {
    id: "demo-opp-2",
    title: "Autonomous Medical Imaging Analysis Assistant",
    intent: "OFFERING_SOLUTION",
    category: "TECH" as OpportunityCategory,
    location: "Boston, MA / Remote",
    budget: "$15,000",
    skills: ["Computer Vision", "PyTorch", "DICOM"],
    matchScore: 92,
    summary: "Offering proprietary computer-vision models for pre-screening radiology scans with hospital teams.",
  },
  {
    id: "demo-opp-3",
    title: "Cross-Border B2B Supply Chain Aggregator",
    intent: "SEEKING_SOLUTION",
    category: "BUSINESS" as OpportunityCategory,
    location: "Chicago, IL",
    budget: "$12,000",
    skills: ["Supply Chain ERP", "Logistics", "Contracting"],
    matchScore: 89,
    summary: "Looking for distribution partners and customs integration experts for Midwest manufacturing hubs.",
  },
  {
    id: "demo-opp-4",
    title: "Solar Microgrid Energy Optimization & Dispatch",
    intent: "OFFERING_SOLUTION",
    category: "LOCAL" as OpportunityCategory,
    location: "Austin, TX",
    budget: "$6,000",
    skills: ["IoT Sensors", "Embedded Rust", "CleanTech"],
    matchScore: 88,
    summary: "Offering IoT firmware and dispatch algorithms for neighborhood solar storage networks.",
  },
];

export const RecommendedOpportunitiesSection: React.FC<
  RecommendedOpportunitiesSectionProps
> = ({
  currentUser,
  onSelectCategory,
  onExploreAll,
  onViewOpportunity,
  onQuickIntent,
}) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<OpportunityMatchesResponse | null>(null);
  const [liveOpportunities, setLiveOpportunities] = useState<OpportunityPublic[]>([]);
  const [expandedRationaleId, setExpandedRationaleId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isMounted = true;

    if (currentUser) {
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
    } else {
      setMatches(null);
      async function loadLivePublished() {
        try {
          const res = await fetchPublishedOpportunities({ limit: 4, sort: "newest" });
          if (isMounted && res && Array.isArray(res.items) && res.items.length > 0) {
            setLiveOpportunities(res.items);
          }
        } catch {
          if (isMounted) {
            setLiveOpportunities([]);
          }
        }
      }
      loadLivePublished();
    }

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
              personalized recommendations from the Opnly opportunity network.
            </p>
          </div>
        </div>
      ) : (
        /* Guest exploration view: Live network opportunities or Fallback Samples */
        <div className="space-y-3.5">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="font-semibold">
                {liveOpportunities.length > 0
                  ? "Live Network Opportunities"
                  : "Example Network Matches"}
              </span>
            </div>
            <span className="text-[11px] text-indigo-600 font-medium hidden sm:inline">
              Your personalized matches will appear here as the opportunity network grows.
            </span>
          </div>

          <div className="space-y-2.5">
            {liveOpportunities.length > 0
              ? liveOpportunities.map((opp) => {
                  const isSeeking = opp.intent === "SEEKING_SOLUTION";
                  return (
                    <div
                      key={opp.id}
                      className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                              Live Network Opportunity
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
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {opp.category}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900">
                            {opp.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                            {opp.problem_statement || opp.proposed_solution || opp.value_proposition || "Opportunity on Opnly network."}
                          </p>
                        </div>

                        {opp.business_name && (
                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-slate-700 block">
                              {opp.business_name}
                            </span>
                            {opp.industry && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {opp.industry}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px]">
                        <div className="flex items-center gap-1 flex-wrap">
                          {opp.required_skills_and_resources && opp.required_skills_and_resources.length > 0 && (
                            <>
                              <span className="text-slate-400 font-medium">Skills:</span>
                              {opp.required_skills_and_resources.slice(0, 3).map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600"
                                >
                                  {skill}
                                </span>
                              ))}
                            </>
                          )}
                        </div>

                        <button
                          onClick={onExploreAll}
                          className="font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-0.5 cursor-pointer ml-2"
                        >
                          <span>Explore Network</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              : DEMO_OPPORTUNITIES.map((demo) => {
                  const isSeeking = demo.intent === "SEEKING_SOLUTION";
                  return (
                    <div
                      key={demo.id}
                      className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                              {demo.matchScore}% Match
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200">
                              Sample Opportunity
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
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {demo.category}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900">
                            {demo.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {demo.summary}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-indigo-700 block">
                            {demo.budget}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {demo.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px]">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-slate-400 font-medium">Skills:</span>
                          {demo.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={onExploreAll}
                          className="font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-0.5 cursor-pointer ml-2"
                        >
                          <span>Explore</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* Categories Shortcuts & Quick Intent CTAs */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div>
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

        {/* Intent CTAs for faster intent matching */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onSelectCategory("TECH")}
            className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Find a Developer
          </button>
          <button
            onClick={() => onSelectCategory("FINTECH")}
            className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Find Funding
          </button>
          <button
            onClick={() => onSelectCategory("BUSINESS")}
            className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Offer Your Skills
          </button>
        </div>
      </div>
    </div>
  );
};
