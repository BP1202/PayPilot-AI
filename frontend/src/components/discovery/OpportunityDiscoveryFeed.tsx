"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  Search,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  Building2,
  Calendar,
  Globe,
  Lock,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Send,
} from "lucide-react";
import {
  OpportunityPublic,
  OpportunityIntent,
  OpportunityCategory,
  OpportunityDiscoveryParams,
  User,
} from "@/types";
import { fetchPublishedOpportunities } from "@/lib/api";
import { OpportunityDetailModal } from "./OpportunityDetailModal";

interface OpportunityDiscoveryFeedProps {
  currentUser?: User | null;
  initialIntent?: OpportunityIntent;
  initialCategory?: OpportunityCategory;
  initialQuery?: string;
  onOpenInStudio?: (opp: OpportunityPublic) => void;
  onCreateOpportunity?: (intent?: OpportunityIntent, category?: OpportunityCategory) => void;
  onConnect?: (opp: OpportunityPublic) => void;
}

const CATEGORIES: { label: string; value: OpportunityCategory }[] = [
  { label: "Fintech", value: "FINTECH" },
  { label: "Tech", value: "TECH" },
  { label: "Business", value: "BUSINESS" },
  { label: "Local", value: "LOCAL" },
];

export const OpportunityDiscoveryFeed: React.FC<OpportunityDiscoveryFeedProps> = ({
  currentUser,
  initialIntent,
  initialCategory,
  initialQuery = "",
  onOpenInStudio,
  onCreateOpportunity,
  onConnect,
}) => {
  const [opportunities, setOpportunities] = useState<OpportunityPublic[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);
  const [selectedIntent, setSelectedIntent] = useState<OpportunityIntent | undefined>(
    initialIntent
  );
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | undefined>(
    initialCategory
  );
  const [industryFilter, setIndustryFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Detail Modal state
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityPublic | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [, startTransition] = useTransition();

  const loadDiscoveryFeed = useCallback(
    async (params: OpportunityDiscoveryParams) => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchPublishedOpportunities(params);
        setOpportunities(res.items);
        setTotalCount(res.total);
        setTotalPages(res.pages || 1);
        setCurrentPage(res.page || 1);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "We're having trouble loading the opportunity network. Please check your connection and try again.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger search whenever filters or page change
  useEffect(() => {
    const params: OpportunityDiscoveryParams = {
      q: searchQuery.trim() || undefined,
      intent: selectedIntent,
      category: selectedCategory,
      industry: industryFilter.trim() || undefined,
      skill: skillFilter.trim() || undefined,
      sort: sortOrder,
      page: currentPage,
      limit: 9,
    };

    loadDiscoveryFeed(params);
  }, [
    searchQuery,
    selectedIntent,
    selectedCategory,
    industryFilter,
    skillFilter,
    sortOrder,
    currentPage,
    loadDiscoveryFeed,
  ]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedIntent(undefined);
    setSelectedCategory(undefined);
    setIndustryFilter("");
    setSkillFilter("");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedIntent) ||
    Boolean(selectedCategory) ||
    Boolean(industryFilter) ||
    Boolean(skillFilter) ||
    sortOrder !== "newest";

  const handleCardClick = (opp: OpportunityPublic) => {
    setSelectedOpportunity(opp);
    setIsDetailOpen(true);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md border border-indigo-400/30">
            <Compass className="h-3.5 w-3.5" />
            <span>Opportunity Discovery Network</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Discover Verified Opportunities & Needs
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Explore commercial initiatives across the network. Connect capabilities, skills,
            and products with businesses actively seeking solutions.
          </p>
        </div>

        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Top search & sort row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search opportunities by title, problem, industry, or skills..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
              aria-label="Search opportunities"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort order select */}
          <div className="flex items-center space-x-2 shrink-0">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <label htmlFor="sort-order-select" className="sr-only">
              Sort opportunities
            </label>
            <select
              id="sort-order-select"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as "newest" | "oldest");
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Intent selection tabs & Category pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Intent Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setSelectedIntent(undefined);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedIntent === undefined
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Intents
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIntent("SEEKING_SOLUTION");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedIntent === "SEEKING_SOLUTION"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Seeking Solutions
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIntent("OFFERING_SOLUTION");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedIntent === "OFFERING_SOLUTION"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Offering Solutions
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(undefined);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                selectedCategory === undefined
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setSelectedCategory(
                    selectedCategory === cat.value ? undefined : cat.value
                  );
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                  selectedCategory === cat.value
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters row (Industry & Skill) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Industry:</span>
            <input
              type="text"
              value={industryFilter}
              onChange={(e) => {
                setIndustryFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="e.g. Logistics, Clean Energy"
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Skill:</span>
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => {
                setSkillFilter(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="e.g. Python, IoT, React"
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto inline-flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              loadDiscoveryFeed({
                q: searchQuery.trim() || undefined,
                intent: selectedIntent,
                category: selectedCategory,
                industry: industryFilter.trim() || undefined,
                skill: skillFilter.trim() || undefined,
                sort: sortOrder,
                page: currentPage,
                limit: 9,
              })
            }
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer ml-4"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span data-testid="discovery-results-count">
          Showing <strong className="text-slate-800">{opportunities.length}</strong> of{" "}
          <strong className="text-slate-800">{totalCount}</strong> published opportunities
        </span>
        {totalPages > 1 && (
          <span>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Opportunities Grid / Loading Skeleton / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="discovery-loading">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded-full" />
                <div className="h-4 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
              <div className="flex gap-1.5 pt-2">
                <div className="h-5 w-16 bg-slate-100 rounded-md" />
                <div className="h-5 w-20 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Compass className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              No matching opportunities found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any published opportunities matching your current search or
              filters. Try adjusting your query or resetting filters.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Clear all filters
              </button>
            )}
            {onCreateOpportunity && (
              <button
                type="button"
                onClick={() => onCreateOpportunity(selectedIntent, selectedCategory)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
              >
                Publish a New Opportunity
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              onClick={() => handleCardClick(opp)}
              className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(opp);
                }
              }}
              aria-label={`View details for ${opp.title}`}
            >
              {/* Card top badges */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        opp.intent === "OFFERING_SOLUTION"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {opp.intent === "OFFERING_SOLUTION" ? "Offering" : "Seeking"}
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {opp.category}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      opp.visibility === "PUBLIC"
                        ? "text-sky-700 bg-sky-50"
                        : "text-purple-700 bg-purple-50"
                    }`}
                  >
                    {opp.visibility === "PUBLIC" ? (
                      <>
                        <Globe className="h-2.5 w-2.5 mr-1" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        <span>Members</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Title & snippet */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {opp.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {opp.value_proposition ||
                      opp.problem_statement ||
                      opp.proposed_solution ||
                      "Explore details in the full opportunity profile."}
                  </p>
                </div>

                {/* Skills tags */}
                {opp.required_skills_and_resources &&
                  opp.required_skills_and_resources.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {opp.required_skills_and_resources.slice(0, 3).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {opp.required_skills_and_resources.length > 3 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-500">
                          +{opp.required_skills_and_resources.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
              </div>

              {/* Card Footer: Attribution & Published Date */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-1 truncate max-w-[60%]">
                  {opp.business_name ? (
                    <>
                      <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 truncate">
                        {opp.business_name}
                      </span>
                    </>
                  ) : opp.industry ? (
                    <span className="text-slate-600 truncate">{opp.industry}</span>
                  ) : (
                    <span>Network Partner</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(opp.published_at || opp.created_at)}</span>
                </div>
                  {onConnect && (!currentUser || currentUser.id !== opp.user_id) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnect(opp);
                      }}
                      className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer border border-indigo-200/80"
                      title="Connect with creator of this opportunity"
                    >
                      <Send className="h-2.5 w-2.5" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-semibold text-slate-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <OpportunityDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOpportunity(null);
        }}
        opportunity={selectedOpportunity}
        onOpenInStudio={onOpenInStudio}
        onConnect={onConnect}
        currentUser={currentUser}
        isOwner={Boolean(currentUser && selectedOpportunity?.user_id && currentUser.id === selectedOpportunity.user_id)}
      />
    </div>
  );
};
