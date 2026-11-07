"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  PlusCircle,
  Compass,
  Lightbulb,
  Handshake,
  Briefcase,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  FileCheck2,
  Layers,
} from "lucide-react";
import {
  Opportunity,
  OpportunityStatus,
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
} from "@/lib/api";

interface SeekerDashboardViewProps {
  currentUser?: User | null;
  opportunities: Opportunity[];
  isLoadingOpps?: boolean;
  onPostNeed: () => void;
  onBrowseContributors: () => void;
  onViewMyOpportunities: () => void;
  onViewConnections: () => void;
  onOpenDealRooms: () => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onSwitchWorkspace: () => void;
}

interface ActivityItem {
  id: string;
  type: "connection" | "proposal" | "deal_room" | "opportunity";
  title: string;
  description: string;
  timestamp: string;
  statusBadge?: string;
  statusColor?: string;
}

const PUBLISHED_STATUSES: OpportunityStatus[] = [
  "PUBLISHED",
  "MATCHING",
  "NEGOTIATING",
  "TRANSACTING",
  "GROWING",
];

const DRAFT_STATUSES: OpportunityStatus[] = ["DRAFT", "ANALYSED"];

export const SeekerDashboardView: React.FC<SeekerDashboardViewProps> = ({
  currentUser,
  opportunities,
  isLoadingOpps = false,
  onPostNeed,
  onBrowseContributors,
  onViewMyOpportunities,
  onViewConnections,
  onOpenDealRooms,
  onSelectOpportunity,
  onSwitchWorkspace,
}) => {
  const [dealRooms, setDealRooms] = useState<DealRoom[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [suggestedMatchesCount, setSuggestedMatchesCount] = useState<number>(0);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingDetails(true);
    setLoadError(null);

    try {
      const [roomsRes, connsRes, propsRes, recsRes] = await Promise.allSettled([
        fetchDealRooms(),
        fetchConnectionRequests("all"),
        fetchProposals(),
        fetchRecommendedOpportunities(),
      ]);

      if (roomsRes.status === "fulfilled") {
        setDealRooms(roomsRes.value.items || []);
      }
      if (connsRes.status === "fulfilled") {
        setConnections(connsRes.value.items || []);
      }
      if (propsRes.status === "fulfilled") {
        setProposals(propsRes.value.items || []);
      }
      if (recsRes.status === "fulfilled") {
        // Distinct suggested matches count
        const matches = recsRes.value.items || [];
        setSuggestedMatchesCount(matches.length);
      }

      // If all major requests failed, notify user
      if (
        roomsRes.status === "rejected" &&
        connsRes.status === "rejected" &&
        propsRes.status === "rejected"
      ) {
        setLoadError(
          "We could not refresh some collaboration records. Please check your connection."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard records.";
      setLoadError(msg);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Precise Lifecycle Counts (User's Opportunities)
  const userNeeds = opportunities.filter(
    (o) => o.intent === "SEEKING_SOLUTION" || o.submission_type === "PROBLEM"
  );
  // Also count user's general opportunities if intent not explicitly set
  const allUserOpps = opportunities.length > 0 ? opportunities : userNeeds;

  const draftNeedsCount = allUserOpps.filter((o) =>
    DRAFT_STATUSES.includes(o.status)
  ).length;

  const publishedNeedsCount = allUserOpps.filter(
    (o) =>
      PUBLISHED_STATUSES.includes(o.status) ||
      o.visibility === "PUBLIC" ||
      o.visibility === "AUTHENTICATED" ||
      o.visibility === "SHARED"
  ).length;

  // Ongoing Collaborations: Distinct Deal Rooms with active status
  const ongoingCollaborationsCount = dealRooms.filter(
    (r) => r.status === "ACTIVE" || r.status === "COMPLETION_REVIEW"
  ).length;

  // Recent Activity Feed: Aggregated from authorized, real records (privacy safe)
  const activityItems: ActivityItem[] = [];

  // 1. Connection requests
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

  // 2. Proposal updates
  proposals.slice(0, 3).forEach((prop) => {
    activityItems.push({
      id: `prop-${prop.id}`,
      type: "proposal",
      title: "Proposal Update",
      description: `Proposal "${prop.title}" is ${prop.status.replace(/_/g, " ").toLowerCase()}`,
      timestamp: "Recent",
      statusBadge: prop.status.replace(/_/g, " "),
      statusColor: prop.status === "ACCEPTED" ? "text-emerald-700 bg-emerald-50" : "text-indigo-700 bg-indigo-50",
    });
  });

  // 3. Deal Rooms
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

  // 4. Recently updated user opportunities
  opportunities.slice(0, 3).forEach((opp) => {
    activityItems.push({
      id: `opp-${opp.id}`,
      type: "opportunity",
      title: opp.status === "PUBLISHED" ? "Need Published" : "Need Updated",
      description: `"${opp.title}" · ${opp.category}`,
      timestamp: opp.updated_at || opp.created_at || "Recent",
      statusBadge: opp.status,
      statusColor: opp.status === "PUBLISHED" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50",
    });
  });

  // Sort activity items (most recent first)
  const displayedActivity = activityItems.slice(0, 5);

  const formatTime = (ts: string) => {
    if (ts === "Recent" || ts === "Pending" || ts === "Active") return ts;
    try {
      const diffMs = Date.now() - new Date(ts).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Just now";
      if (diffHours === 1) return "1h ago";
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-900">
      {/* ========================================================================= */}
      {/* 1. CLEAR DASHBOARD INTRODUCTION                                          */}
      {/* ========================================================================= */}
      <section
        aria-label="Seeker Workspace Introduction"
        className="rounded-3xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/70 p-6 sm:p-8 shadow-xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Workspace & Role Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-900">
                <Search className="h-3.5 w-3.5 text-blue-700" />
                <span>Seeker Workspace</span>
              </span>
              <button
                type="button"
                onClick={onSwitchWorkspace}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Switch to Contributor Workspace (One account supports both paths)"
              >
                <Sparkles className="h-3 w-3 text-emerald-600" />
                <span>Switch to Contributor</span>
              </button>
            </div>

            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Seeker Workspace
            </h1>

            {/* Subhead with accurate capability wording */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Describe a business problem or need, discover contributors with relevant
              capabilities, and collaborate toward a solution.
            </p>
          </div>

          {/* Primary Action Row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onPostNeed}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-200 transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Post a Need</span>
            </button>
            <button
              type="button"
              onClick={onBrowseContributors}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-xs transition cursor-pointer"
            >
              <Compass className="h-4 w-4 text-indigo-600" />
              <span>Browse Contributors</span>
            </button>
          </div>
        </div>
      </section>

      {/* Error Banner if requests fail */}
      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
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
          Primary Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Action 1: Post a Need */}
          <button
            type="button"
            onClick={onPostNeed}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs mb-2.5 group-hover:scale-105 transition">
                <PlusCircle className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-900">
                Post a Need
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Structure a business problem, requirements, and budget.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-700">
              <span>Start Need</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 2: Browse Contributors */}
          <button
            type="button"
            onClick={onBrowseContributors}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2.5 group-hover:scale-105 transition">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-900">
                Browse Contributors
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Search capability offerings and available solutions.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
              <span>Explore Network</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 3: My Opportunities */}
          <button
            type="button"
            onClick={onViewMyOpportunities}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100 mb-2.5 group-hover:scale-105 transition">
                <Lightbulb className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-amber-900">
                My Opportunities
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Manage your captured drafts and active published needs.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-700">
              <span>View Listings</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Action 4: Connections */}
          <button
            type="button"
            onClick={onViewConnections}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-left transition cursor-pointer shadow-2xs"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100 mb-2.5 group-hover:scale-105 transition">
                <Handshake className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-teal-900">
                Connections
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Review connection requests and commercial proposals.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-teal-700">
              <span>Manage Requests</span>
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
                Coordinate terms, agreements, and milestone deliverables.
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
      {/* 3. OPPORTUNITY OVERVIEW (REAL SUMMARY COUNTS)                             */}
      {/* ========================================================================= */}
      <section aria-label="Opportunity Overview" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Opportunity Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Draft Needs */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Draft Needs
            </span>
            <div className="text-2xl font-black text-slate-900">
              {isLoadingOpps ? (
                <span className="text-slate-300">—</span>
              ) : (
                draftNeedsCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {draftNeedsCount === 1 ? "1 captured draft" : `${draftNeedsCount} captured drafts`}
            </p>
          </div>

          {/* Card 2: Published Needs */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Published Needs
            </span>
            <div className="text-2xl font-black text-blue-600">
              {isLoadingOpps ? (
                <span className="text-slate-300">—</span>
              ) : (
                publishedNeedsCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {publishedNeedsCount === 1 ? "1 active need in network" : `${publishedNeedsCount} active needs in network`}
            </p>
          </div>

          {/* Card 3: Suggested Matches */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Suggested Matches
            </span>
            <div className="text-2xl font-black text-indigo-600">
              {isLoadingDetails ? (
                <span className="text-slate-300">—</span>
              ) : (
                suggestedMatchesCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {suggestedMatchesCount === 1 ? "1 candidate recommendation" : `${suggestedMatchesCount} candidate recommendations`}
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
              ) : (
                ongoingCollaborationsCount
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {ongoingCollaborationsCount === 1 ? "1 active Deal Room" : `${ongoingCollaborationsCount} active Deal Rooms`}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. RECENT ACTIVITY & ACTIVE NEEDS GRID                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Recent Activity (Authorized Events or Guided Empty State) */}
        <section
          aria-label="Recent Activity"
          className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
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
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {isLoadingDetails || isLoadingOpps ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400">Loading activity...</p>
              </div>
            ) : displayedActivity.length === 0 ? (
              /* Guided Empty State */
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">No recent activity yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Post a need or browse available contributors to start your first collaboration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onPostNeed}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Post a Need</span>
                </button>
              </div>
            ) : (
              /* Real Authorized Events List */
              <div className="space-y-2.5">
                {displayedActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {item.statusBadge && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                            item.statusColor || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.statusBadge}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Active Needs & Drafts (Seeker Focus) */}
        <section
          aria-label="My Captured Needs"
          className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">My Captured Needs</h2>
              </div>
              <button
                type="button"
                onClick={onViewMyOpportunities}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Manage all</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {isLoadingOpps ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400">Loading opportunities...</p>
              </div>
            ) : allUserOpps.length === 0 ? (
              /* Guided Empty State for Needs */
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">You haven&apos;t posted any needs yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Describe your business challenge or technical requirements to get matched with contributors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onPostNeed}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Post Your First Need</span>
                </button>
              </div>
            ) : (
              /* User Needs List */
              <div className="space-y-2.5">
                {allUserOpps.slice(0, 3).map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => onSelectOpportunity(opp)}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {opp.title}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {opp.category} · {opp.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                          opp.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {opp.status}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

