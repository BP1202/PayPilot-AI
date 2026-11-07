import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Sparkles,
  Layers,
  Handshake,
  Briefcase,
  PlusCircle,
  UserCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Target,
  FileCheck2,
  Tag,
  CheckCircle2,
} from "lucide-react";
import {
  Opportunity,
  OpportunityStatus,
  OpportunityCandidate,
  OpportunityPublic,
  DealRoom,
  Connection,
  Proposal,
  User,
} from "@/types";
import {
  fetchDealRooms,
  fetchConnectionRequests,
  fetchProposals,
  fetchRecommendedOpportunities,
  fetchPublishedOpportunities,
} from "@/lib/api";

interface ContributorDashboardViewProps {
  currentUser?: User | null;
  opportunities: Opportunity[];
  isLoadingOpps?: boolean;
  oppError?: string | null;
  onRetryOpps?: () => void;
  onBrowseOpportunities: () => void;
  onOfferSkills: () => void;
  onCompleteProfile: () => void;
  onManageMyOffers: () => void;
  onViewSuggestedMatches?: () => void;
  onViewConnections: () => void;
  onOpenDealRooms: () => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onSwitchWorkspace: () => void;
}

interface ActivityItem {
  id: string;
  type: "connection" | "proposal" | "deal_room" | "offer";
  title: string;
  description: string;
  timestamp: string;
  statusBadge?: string;
  statusColor?: string;
}

const ACTIVE_DISCOVERY_STATUSES: OpportunityStatus[] = [
  "PUBLISHED",
  "MATCHING",
  "NEGOTIATING",
  "TRANSACTING",
  "GROWING",
];

// General network discoverability is restricted to PUBLIC and AUTHENTICATED
const DISCOVERABLE_VISIBILITIES = ["PUBLIC", "AUTHENTICATED"];

const EXCLUDED_FROM_ACTIVE_STATUSES: OpportunityStatus[] = [
  "DRAFT",
  "ANALYSED",
  "COMPLETED",
  "ARCHIVED",
  "CLOSED",
];

export const ContributorDashboardView: React.FC<ContributorDashboardViewProps> = ({
  currentUser,
  opportunities,
  isLoadingOpps = false,
  oppError = null,
  onRetryOpps,
  onBrowseOpportunities,
  onOfferSkills,
  onCompleteProfile,
  onManageMyOffers,
  onViewSuggestedMatches,
  onViewConnections,
  onOpenDealRooms,
  onSelectOpportunity,
  onSwitchWorkspace,
}) => {
  const [dealRooms, setDealRooms] = useState<DealRoom[] | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [recommendedNeeds, setRecommendedNeeds] = useState<OpportunityCandidate[] | null>(null);
  const [fallbackPublishedNeeds, setFallbackPublishedNeeds] = useState<OpportunityPublic[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingDetails(true);
    setLoadError(null);

    try {
      const [roomsRes, connsRes, propsRes, recsRes] = await Promise.allSettled([
        fetchDealRooms(),
        fetchConnectionRequests("all"),
        fetchProposals("all"),
        fetchRecommendedOpportunities(10),
      ]);

      if (roomsRes.status === "fulfilled") {
        setDealRooms(roomsRes.value.items || []);
      } else {
        setDealRooms(null);
      }

      if (connsRes.status === "fulfilled") {
        setConnections(connsRes.value.items || []);
      }

      if (propsRes.status === "fulfilled") {
        setProposals(propsRes.value.items || []);
      } else {
        setProposals(null);
      }

      if (recsRes.status === "fulfilled") {
        setRecommendedNeeds(recsRes.value.items || []);
      } else {
        setRecommendedNeeds(null);
        // Explicit fallback: Attempt to load general published opportunities for explicit fallback view
        try {
          const publishedRes = await fetchPublishedOpportunities({ intent: "SEEKING_SOLUTION", limit: 5 });
          setFallbackPublishedNeeds(publishedRes.items || []);
        } catch {
          setFallbackPublishedNeeds([]);
        }
      }

      // If any major request failed, notify user and avoid showing misleading zeros
      if (
        roomsRes.status === "rejected" ||
        connsRes.status === "rejected" ||
        propsRes.status === "rejected" ||
        recsRes.status === "rejected"
      ) {
        setLoadError(
          "We could not refresh some collaboration records. Please check your connection or retry."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard records.";
      setLoadError(msg);
      setDealRooms(null);
      setProposals(null);
      setRecommendedNeeds(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Precise Lifecycle Counts (Contributor's Own Offers)
  // Include opportunities explicitly marked OFFERING_SOLUTION, or general/legacy opportunities where intent is not SEEKING_SOLUTION
  const myOffers = opportunities.filter(
    (o) => o.intent === "OFFERING_SOLUTION" || (!o.intent && o.submission_type !== "PROBLEM")
  );

  // Dual-criteria Active Offers:
  // 1. Authoritative intent: OFFERING_SOLUTION
  // 2. Lifecycle: in active discovery stage
  // 3. Network discoverability: PUBLIC or AUTHENTICATED
  // 4. Strict exclusion: drafts, analysed, completed, archived, closed, shared, private
  const activeOffersCount = myOffers.filter((o) => {
    const isActiveLifecycle = ACTIVE_DISCOVERY_STATUSES.includes(o.status);
    const isDiscoverableVisibility = DISCOVERABLE_VISIBILITIES.includes(o.visibility);
    const isExcluded = EXCLUDED_FROM_ACTIVE_STATUSES.includes(o.status);

    return isActiveLifecycle && isDiscoverableVisibility && !isExcluded;
  }).length;

  // Suggested Opportunities Metric:
  // Count of distinct recommended needs from recommendation endpoint
  const suggestedOpportunitiesCount =
    recommendedNeeds !== null
      ? new Set(recommendedNeeds.map((n) => n.id)).size
      : null;

  // Pending Proposals Metric:
  // Actionable proposals: SUBMITTED (awaiting client), UNDER_REVIEW (in review), REVISION_REQUESTED (revision needed)
  const pendingProposalsList =
    proposals !== null
      ? proposals.filter((p) =>
          ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED"].includes(p.status)
        )
      : null;

  const pendingProposalsCount =
    pendingProposalsList !== null ? pendingProposalsList.length : null;

  const revisionsRequestedCount =
    pendingProposalsList !== null
      ? pendingProposalsList.filter((p) => p.status === "REVISION_REQUESTED").length
      : 0;

  // Ongoing Collaborations: Distinct Deal Rooms with active status
  const ongoingCollaborationsCount =
    dealRooms !== null
      ? dealRooms.filter(
          (r) => r.status === "ACTIVE" || r.status === "COMPLETION_REVIEW"
        ).length
      : null;

  // Recent Activity Feed: Aggregated from authorized, real records (zero financial budget leakage)
  const activityItems: ActivityItem[] = [];

  // 1. Proposals: Only surface status & title, never internal budget amounts or secret deliverables
  if (proposals) {
    proposals.slice(0, 3).forEach((prop) => {
      activityItems.push({
        id: `prop-${prop.id}`,
        type: "proposal",
        title: "Proposal Update",
        description: `Proposal "${prop.title}" is ${prop.status.replace(/_/g, " ").toLowerCase()}`,
        timestamp: "Recent",
        statusBadge: prop.status.replace(/_/g, " "),
        statusColor:
          prop.status === "ACCEPTED"
            ? "text-emerald-700 bg-emerald-50"
            : prop.status === "REVISION_REQUESTED"
            ? "text-amber-700 bg-amber-50"
            : "text-indigo-700 bg-indigo-50",
      });
    });
  }

  // 2. Incoming and outgoing connection requests
  connections.slice(0, 3).forEach((conn) => {
    activityItems.push({
      id: `conn-${conn.id}`,
      type: "connection",
      title: "Connection Request",
      description: `Connection with ${conn.recipient?.full_name || conn.requester?.full_name || "partner"} is ${conn.status.toLowerCase()}`,
      timestamp: conn.status === "PENDING" ? "Pending" : "Recent",
      statusBadge: conn.status,
      statusColor: conn.status === "ACCEPTED" ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50",
    });
  });

  // 3. Deal Rooms (Active Collaboration workspaces)
  if (dealRooms) {
    dealRooms.slice(0, 3).forEach((room) => {
      activityItems.push({
        id: `room-${room.id}`,
        type: "deal_room",
        title: "Deal Room Active",
        description: `Collaboration workspace active for "${room.title}"`,
        timestamp: "Active",
        statusBadge: room.status,
        statusColor: "text-purple-700 bg-purple-50",
      });
    });
  }

  // 4. Contributor's own offers
  myOffers.slice(0, 3).forEach((opp) => {
    activityItems.push({
      id: `offer-${opp.id}`,
      type: "offer",
      title: opp.status === "PUBLISHED" ? "Offer Published" : "Offer Updated",
      description: `"${opp.title}" · ${opp.category}`,
      timestamp: opp.updated_at || opp.created_at || "Recent",
      statusBadge: opp.status,
      statusColor: opp.status === "PUBLISHED" ? "text-emerald-700 bg-emerald-50" : "text-slate-700 bg-slate-50",
    });
  });

  const displayedActivity = activityItems.slice(0, 5);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. DASHBOARD INTRODUCTION                                                 */}
      {/* ========================================================================= */}
      <section
        aria-label="Contributor Workspace Introduction"
        className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/20 p-6 sm:p-8 shadow-xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Contributor Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Contributor Workspace
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Offer your capabilities, discover business needs where you can contribute, and
              collaborate toward commercial outcomes.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>One account supports both workspaces. Need a solution instead? Switch to Seeker Workspace:</span>
              <button
                type="button"
                onClick={onSwitchWorkspace}
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>Seeker Workspace</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBrowseOpportunities}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-200 transition cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>Browse Opportunities</span>
            </button>
            <button
              type="button"
              onClick={onOfferSkills}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-emerald-600" />
              <span>Offer Your Skills</span>
            </button>
            <button
              type="button"
              onClick={onCompleteProfile}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition cursor-pointer"
              title="View and edit your shared individual & organization profile"
            >
              <UserCheck className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          </div>
        </div>
      </section>

      {/* Error Banner if requests fail */}
      {(loadError || oppError) && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">
                {oppError ? "Unable to load opportunities" : "Unable to load dashboard records"}
              </p>
              <p className="text-amber-700">{oppError || loadError}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Retry or try again"
            onClick={async () => {
              if (oppError && onRetryOpps) {
                onRetryOpps();
              }
              if (loadError) {
                await loadDashboardData();
              }
            }}
            className="inline-flex items-center gap-1 font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRIMARY ACTIONS (5 KEY ACTIONS)                                        */}
      {/* ========================================================================= */}
      <section aria-label="Primary Actions" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Action 1: Browse Opportunities */}
          <button
            type="button"
            onClick={onBrowseOpportunities}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs mb-2.5 group-hover:scale-105 transition">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-900">
                Browse Opportunities
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Explore published business needs and client problems.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <span>Explore Needs</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 2: View Suggested Matches */}
          <button
            type="button"
            onClick={onViewSuggestedMatches || onBrowseOpportunities}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2.5 group-hover:scale-105 transition">
                <Target className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-900">
                Suggested Matches
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                View needs matched to your skills and profile capabilities.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-700">
              <span>View Recommendations</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 3: Manage My Offers */}
          <button
            type="button"
            onClick={onManageMyOffers}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2.5 group-hover:scale-105 transition">
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-900">
                Manage My Offers
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                View, refine, and update your published capability offers.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <span>View My Offers</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 4: Connections & Proposals */}
          <button
            type="button"
            onClick={onViewConnections}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100 mb-2.5 group-hover:scale-105 transition">
                <Handshake className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-teal-900">
                Connections & Proposals
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Track submitted proposals and client inquiry messages.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-teal-700">
              <span>View Proposals</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 5: Deal Rooms */}
          <button
            type="button"
            onClick={onOpenDealRooms}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100 mb-2.5 group-hover:scale-105 transition">
                <Briefcase className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-900">
                Deal Rooms
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Manage commercial agreements and milestone deliverables.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-700">
              <span>Open Rooms</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. YOUR ACTIVITY OVERVIEW (REAL SUMMARY COUNTS)                          */}
      {/* ========================================================================= */}
      <section aria-label="Your Activity Overview" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Your Activity Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Active Offers */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Active Offers
            </span>
            <div className="text-2xl font-black text-emerald-600">
              {isLoadingOpps ? (
                <span className="text-slate-300">—</span>
              ) : (
                activeOffersCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {activeOffersCount === 1
                ? "1 active capability offer"
                : `${activeOffersCount} active capability offers`}
            </p>
          </div>

          {/* Card 2: Suggested Opportunities */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Suggested Opportunities
            </span>
            <div className="text-2xl font-black text-indigo-600">
              {isLoadingDetails ? (
                <span className="text-slate-300">—</span>
              ) : suggestedOpportunitiesCount === null ? (
                <span className="text-slate-400 text-base font-semibold">Unavailable</span>
              ) : (
                suggestedOpportunitiesCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isLoadingDetails || suggestedOpportunitiesCount === null
                ? "Matching business needs"
                : suggestedOpportunitiesCount === 1
                ? "1 matching business need"
                : `${suggestedOpportunitiesCount} matching business needs`}
            </p>
          </div>

          {/* Card 3: Pending Proposals */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Pending Proposals
            </span>
            <div className="text-2xl font-black text-teal-600">
              {isLoadingDetails ? (
                <span className="text-slate-300">—</span>
              ) : pendingProposalsCount === null ? (
                <span className="text-slate-400 text-base font-semibold">Unavailable</span>
              ) : (
                pendingProposalsCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isLoadingDetails || pendingProposalsCount === null
                ? "Proposals in review"
                : revisionsRequestedCount > 0
                ? `${pendingProposalsCount} pending (${revisionsRequestedCount} revision needed)`
                : pendingProposalsCount === 1
                ? "1 proposal awaiting review"
                : `${pendingProposalsCount} proposals awaiting review`}
            </p>
          </div>

          {/* Card 4: Ongoing Collaborations */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Ongoing Collaborations
            </span>
            <div className="text-2xl font-black text-purple-600">
              {isLoadingDetails ? (
                <span className="text-slate-300">—</span>
              ) : ongoingCollaborationsCount === null ? (
                <span className="text-slate-400 text-base font-semibold">Unavailable</span>
              ) : (
                ongoingCollaborationsCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isLoadingDetails || ongoingCollaborationsCount === null
                ? "Active Deal Rooms"
                : ongoingCollaborationsCount === 1
                ? "1 active Deal Room"
                : `${ongoingCollaborationsCount} active Deal Rooms`}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SUGGESTED BUSINESS NEEDS & RECENT ACTIVITY GRID                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Suggested Business Needs (Evidence-Based Recommendations) */}
        <section
          aria-label="Suggested Business Needs"
          className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Suggested Business Needs</h2>
              </div>
              <button
                type="button"
                onClick={onBrowseOpportunities}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Browse All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* List of recommended needs or explicit fallback */}
            {isLoadingDetails ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 p-4 rounded-xl border border-slate-100">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-4/5" />
                  </div>
                ))}
              </div>
            ) : recommendedNeeds && recommendedNeeds.length > 0 ? (
              <div className="space-y-3">
                {recommendedNeeds.slice(0, 3).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-200 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {candidate.category}
                          </span>
                          {candidate.industry && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              • {candidate.industry}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                          {candidate.title}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={onBrowseOpportunities}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Problem/Value Proposition statement */}
                    {candidate.value_proposition && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {candidate.value_proposition}
                      </p>
                    )}

                    {/* Required Skills */}
                    {candidate.required_skills_and_resources &&
                      candidate.required_skills_and_resources.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {candidate.required_skills_and_resources.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600"
                            >
                              <Tag className="h-2.5 w-2.5 text-slate-400" />
                              <span>{skill}</span>
                            </span>
                          ))}
                        </div>
                      )}

                    {/* Evidence-Based Match Explanation Rationale (When provided by engine) */}
                    {candidate.explanation?.explanation_summary && (
                      <div className="mt-1 flex items-start gap-1.5 p-2 rounded-lg bg-emerald-50/80 border border-emerald-100 text-[11px] text-emerald-900">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          {candidate.explanation.explanation_summary}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : fallbackPublishedNeeds.length > 0 ? (
              /* Explicitly labelled fallback when recommendations are unavailable */
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Personalized recommendations unavailable. Displaying available published needs from the network:
                  </span>
                </div>
                {fallbackPublishedNeeds.slice(0, 3).map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {opp.title}
                      </h4>
                      <button
                        type="button"
                        onClick={onBrowseOpportunities}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {opp.problem_statement || opp.proposed_solution || ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Guided empty state */
              <div className="py-8 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Target className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    No suggestions yet
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Browse published opportunities in the network or complete your profile skills to
                    receive relevant suggestions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBrowseOpportunities}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Browse Opportunities</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Recent Activity (Authorized Events) */}
        <section
          aria-label="Recent Activity"
          className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
              </div>
              <button
                type="button"
                onClick={onViewConnections}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 p-3 rounded-xl border border-slate-100">
                    <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : displayedActivity.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    No recent activity yet
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Submit proposals to open needs or connect with seekers to start collaborating.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBrowseOpportunities}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-slate-700 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Explore Needs</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedActivity.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        {item.statusBadge && (
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              item.statusColor || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.statusBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{item.description}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 5. MY ACTIVE OFFERS                                                       */}
      {/* ========================================================================= */}
      <section aria-label="My Capability Offers" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              My Capability Offers
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {myOffers.length} Total
            </span>
          </div>
          <button
            type="button"
            onClick={onOfferSkills}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Create New Offer</span>
          </button>
        </div>

        {myOffers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-bold text-slate-800">
                You haven&apos;t posted any capability offers yet
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe your skills, technology, products, or resources to be discovered by seekers looking for solutions.
              </p>
            </div>
            <button
              type="button"
              onClick={onOfferSkills}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-emerald-700 shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Offer Your Skills</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {myOffers.map((offer) => (
              <div
                key={offer.id}
                onClick={() => onSelectOpportunity(offer)}
                className="group p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {offer.category}
                      </span>
                      {offer.industry && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          {offer.industry}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        offer.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 line-clamp-1">
                    {offer.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {offer.original_description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
                  <span>Edit in Studio</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
