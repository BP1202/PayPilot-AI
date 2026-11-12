"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  ShieldCheck,
  Award,
  DollarSign,
  TrendingUp,
  Receipt,
  User as UserIcon,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  Opportunity,
  OpportunityStatus,
  DealRoom,
  Connection,
  Proposal,
  User,
  OpportunityCandidate,
  ParticipantCandidate,
  MilestoneExecution,
  MilestoneListResponse,
  IndividualProfile,
  DashboardOverview,
  OpportunityIntent,
} from "@/types";
import {
  fetchDealRooms,
  fetchConnectionRequests,
  fetchProposals,
  fetchRecommendedOpportunities,
  fetchOpportunityCandidates,
  fetchDealRoomMilestones,
  fetchMyIndividualProfile,
} from "@/lib/api";

export interface UnifiedWorkspaceViewProps {
  currentUser?: User | null;
  opportunities: Opportunity[];
  isLoadingOpps?: boolean;
  oppError?: string | null;
  overview?: DashboardOverview | null;
  onRetryOpps?: () => void;
  onPostNeed: () => void;
  onOfferCapability: () => void;
  onBrowseOpportunities: (filter?: "all" | "needs" | "capabilities") => void;
  onViewMyOpportunities: (filter?: "all" | "needs" | "capabilities") => void;
  onViewConnections: () => void;
  onOpenDealRooms: (roomId?: string) => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onViewMatches?: () => void;
  onViewLedger?: () => void;
  onCompleteProfile?: () => void;
}

const ACTIVE_STATUSES: OpportunityStatus[] = [
  "PUBLISHED",
  "MATCHING",
  "NEGOTIATING",
  "TRANSACTING",
  "GROWING",
];

export const UnifiedWorkspaceView: React.FC<UnifiedWorkspaceViewProps> = ({
  currentUser,
  opportunities,
  isLoadingOpps = false,
  oppError = null,
  overview = null,
  onRetryOpps,
  onPostNeed,
  onOfferCapability,
  onBrowseOpportunities,
  onViewMyOpportunities,
  onViewConnections,
  onOpenDealRooms,
  onSelectOpportunity,
  onViewMatches,
  onViewLedger,
  onCompleteProfile,
}) => {
  // ---------------------------------------------------------------------------
  // 1. Alerts & Notifications State (Independent loading & error)
  // ---------------------------------------------------------------------------
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [rawProposals, setRawProposals] = useState<Proposal[]>([]);
  const [incomingConnections, setIncomingConnections] = useState<Connection[]>([]);

  // ---------------------------------------------------------------------------
  // 2. Deal Rooms & Milestones State (Independent loading & error)
  // ---------------------------------------------------------------------------
  const [dealRooms, setDealRooms] = useState<DealRoom[] | null>(null);
  const [dealRoomsLoading, setDealRoomsLoading] = useState(true);
  const [dealRoomsError, setDealRoomsError] = useState<string | null>(null);
  const [roomMilestonesMap, setRoomMilestonesMap] = useState<Record<string, MilestoneListResponse>>({});

  // ---------------------------------------------------------------------------
  // 3. Trust & Profile State (Independent loading & error)
  // ---------------------------------------------------------------------------
  const [individualProfile, setIndividualProfile] = useState<IndividualProfile | null>(null);
  const [trustLoading, setTrustLoading] = useState(true);
  const [trustError, setTrustError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 4. Two-Way AI Matchmaking State (Independent loading & error)
  // ---------------------------------------------------------------------------
  const [recsTab, setRecsTab] = useState<"partners" | "opportunities">("partners");
  const [selectedSeekingOppId, setSelectedSeekingOppId] = useState<string | null>(null);
  const [partnerMatches, setPartnerMatches] = useState<ParticipantCandidate[] | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  const [skillMatches, setSkillMatches] = useState<OpportunityCandidate[] | null>(null);
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  // My Opportunities search & filter
  const [oppFilter, setOppFilter] = useState<"all" | "needs" | "capabilities" | "drafts">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ---------------------------------------------------------------------------
  // Data Fetching: 1. Alerts
  // ---------------------------------------------------------------------------
  const loadAlertsData = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const [proposalsRes, connsRes] = await Promise.allSettled([
        fetchProposals("all"),
        fetchConnectionRequests("incoming", "PENDING"),
      ]);

      if (proposalsRes.status === "fulfilled") {
        setRawProposals(proposalsRes.value.items || []);
      } else {
        setAlertsError("Unable to load latest proposal alerts.");
      }

      if (connsRes.status === "fulfilled") {
        setIncomingConnections(connsRes.value.items || []);
      } else if (proposalsRes.status === "fulfilled") {
        setAlertsError("Unable to load connection requests.");
      }
    } catch {
      setAlertsError("Unable to load collaboration alerts.");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Data Fetching: 2. Deal Rooms & Controlled Parallel Milestone Loading
  // ---------------------------------------------------------------------------
  const loadDealRoomsData = useCallback(async () => {
    setDealRoomsLoading(true);
    setDealRoomsError(null);
    try {
      const res = await fetchDealRooms();
      const rooms = res.items || [];
      setDealRooms(rooms);

      // Controlled parallel milestone load for active rooms (first 5 to prevent N+1 burst)
      const activeRooms = rooms
        .filter((r) => r.status === "ACTIVE" || r.status === "COMPLETION_REVIEW")
        .slice(0, 5);

      if (activeRooms.length > 0) {
        const milestoneResults = await Promise.allSettled(
          activeRooms.map((r) => fetchDealRoomMilestones(r.id))
        );
        const map: Record<string, MilestoneListResponse> = {};
        milestoneResults.forEach((result, idx) => {
          if (result.status === "fulfilled") {
            map[activeRooms[idx].id] = result.value;
          }
        });
        setRoomMilestonesMap(map);
      }
    } catch {
      setDealRoomsError("Unable to load Deal Rooms. Please try again.");
    } finally {
      setDealRoomsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Data Fetching: 3. Trust & Profile
  // ---------------------------------------------------------------------------
  const loadTrustData = useCallback(async () => {
    setTrustLoading(true);
    setTrustError(null);
    try {
      const p = await fetchMyIndividualProfile();
      setIndividualProfile(p);
    } catch {
      setTrustError("Unable to load profile trust records.");
    } finally {
      setTrustLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Initial Load on Mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadAlertsData();
    loadDealRoomsData();
    loadTrustData();
  }, [loadAlertsData, loadDealRoomsData, loadTrustData]);

  // ---------------------------------------------------------------------------
  // Matchmaking: Published Seeking Opportunities for "Partners for Your Needs"
  // ---------------------------------------------------------------------------
  const publishedSeekingOpps = useMemo(() => {
    return opportunities
      .filter((o) => o.intent === "SEEKING_SOLUTION" && ACTIVE_STATUSES.includes(o.status))
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  }, [opportunities]);

  // Default to the most recently updated seeking opportunity
  useEffect(() => {
    if (publishedSeekingOpps.length > 0) {
      if (!selectedSeekingOppId || !publishedSeekingOpps.some((o) => o.id === selectedSeekingOppId)) {
        setSelectedSeekingOppId(publishedSeekingOpps[0].id);
      }
    } else {
      setSelectedSeekingOppId(null);
    }
  }, [publishedSeekingOpps, selectedSeekingOppId]);

  // Fetch candidate partners when selected seeking opportunity changes
  const loadPartnerMatches = useCallback(async (oppId: string) => {
    setPartnerLoading(true);
    setPartnerError(null);
    try {
      const res = await fetchOpportunityCandidates(oppId, 6);
      setPartnerMatches(res.items || []);
    } catch {
      setPartnerError("Unable to load partner recommendations for this business need.");
    } finally {
      setPartnerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSeekingOppId && recsTab === "partners") {
      loadPartnerMatches(selectedSeekingOppId);
    } else if (!selectedSeekingOppId && recsTab === "partners") {
      setPartnerMatches([]);
      setPartnerLoading(false);
    }
  }, [selectedSeekingOppId, recsTab, loadPartnerMatches]);

  // Fetch opportunities for skills when "opportunities" tab is selected
  const loadSkillMatches = useCallback(async () => {
    setSkillLoading(true);
    setSkillError(null);
    try {
      const res = await fetchRecommendedOpportunities(6);
      setSkillMatches(res.items || []);
    } catch {
      setSkillError("Unable to load opportunities matching your capabilities.");
    } finally {
      setSkillLoading(false);
    }
  }, []);

  useEffect(() => {
    if (recsTab === "opportunities") {
      loadSkillMatches();
    }
  }, [recsTab, loadSkillMatches]);

  // ---------------------------------------------------------------------------
  // Authoritative Derived Metrics (mutually exclusive & deterministic)
  // ---------------------------------------------------------------------------
  const needsCount = useMemo(
    () => opportunities.filter((o) => o.intent === "SEEKING_SOLUTION").length,
    [opportunities]
  );

  const capabilitiesCount = useMemo(
    () => opportunities.filter((o) => o.intent === "OFFERING_SOLUTION").length,
    [opportunities]
  );

  const draftsCount = useMemo(
    () => opportunities.filter((o) => o.status === "DRAFT" || o.status === "ANALYSED").length,
    [opportunities]
  );

  const activeNeedsCount = useMemo(
    () =>
      opportunities.filter(
        (o) => o.intent === "SEEKING_SOLUTION" && ACTIVE_STATUSES.includes(o.status)
      ).length,
    [opportunities]
  );

  const activeCapsCount = useMemo(
    () =>
      opportunities.filter(
        (o) => o.intent === "OFFERING_SOLUTION" && ACTIVE_STATUSES.includes(o.status)
      ).length,
    [opportunities]
  );

  // Filtered opportunities for the hub
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (oppFilter === "needs" && opp.intent !== "SEEKING_SOLUTION") return false;
      if (oppFilter === "capabilities" && opp.intent !== "OFFERING_SOLUTION") return false;
      if (oppFilter === "drafts" && opp.status !== "DRAFT" && opp.status !== "ANALYSED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = opp.title?.toLowerCase().includes(q);
        const descMatch = (opp.original_description || opp.proposed_solution || opp.problem_statement || "")
          .toLowerCase()
          .includes(q);
        const catMatch = (opp.category || "").toLowerCase().includes(q);
        const indMatch = (opp.industry || "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !catMatch && !indMatch) return false;
      }
      return true;
    });
  }, [opportunities, oppFilter, searchQuery]);

  // ---------------------------------------------------------------------------
  // Actionable Alerts Calculation: Verified Sender/Recipient Semantics
  // ---------------------------------------------------------------------------
  // 1. Incoming proposals where currentUser is recipient and status is SUBMITTED or UNDER_REVIEW
  //    OR sent proposals where revision was requested by counterparty
  const actionableProposals = useMemo(() => {
    return rawProposals.filter((p) => {
      const isRecipient = p.recipient?.user_id === currentUser?.id;
      const isProposer = p.proposer?.user_id === currentUser?.id;
      if (isRecipient && (p.status === "SUBMITTED" || p.status === "UNDER_REVIEW")) {
        return true;
      }
      if (isProposer && p.status === "REVISION_REQUESTED") {
        return true;
      }
      return false;
    });
  }, [rawProposals, currentUser?.id]);

  // 2. Incoming connection requests where currentUser is recipient and status is PENDING
  const actionableConnections = useMemo(() => {
    return incomingConnections.filter((c) => {
      return c.status === "PENDING" && c.recipient?.user_id === currentUser?.id;
    });
  }, [incomingConnections, currentUser?.id]);

  // 3. Milestones awaiting review where currentUser is reviewer
  const milestonesToReview = useMemo(() => {
    const items: Array<{
      milestone: MilestoneExecution;
      roomId: string;
      roomTitle: string;
    }> = [];
    Object.entries(roomMilestonesMap).forEach(([roomId, mList]) => {
      const room = dealRooms?.find((r) => r.id === roomId);
      const roomTitle = room?.title || room?.opportunity_title || `Deal Room #${roomId}`;
      (mList.items || []).forEach((m) => {
        if (m.status === "SUBMITTED_FOR_REVIEW" && m.reviewer_user?.user_id === currentUser?.id) {
          items.push({ milestone: m, roomId, roomTitle });
        }
      });
    });
    return items;
  }, [roomMilestonesMap, dealRooms, currentUser?.id]);

  // 4. Milestones needing revision where currentUser is responsible
  const milestonesToRevise = useMemo(() => {
    const items: Array<{
      milestone: MilestoneExecution;
      roomId: string;
      roomTitle: string;
    }> = [];
    Object.entries(roomMilestonesMap).forEach(([roomId, mList]) => {
      const room = dealRooms?.find((r) => r.id === roomId);
      const roomTitle = room?.title || room?.opportunity_title || `Deal Room #${roomId}`;
      (mList.items || []).forEach((m) => {
        if (m.status === "REVISION_REQUESTED" && m.responsible_user?.user_id === currentUser?.id) {
          items.push({ milestone: m, roomId, roomTitle });
        }
      });
    });
    return items;
  }, [roomMilestonesMap, dealRooms, currentUser?.id]);

  const totalAlertsCount =
    actionableProposals.length +
    actionableConnections.length +
    milestonesToReview.length +
    milestonesToRevise.length;

  // Active Deal Rooms list
  const activeDealRooms = useMemo(
    () => (dealRooms || []).filter((d) => d.status === "ACTIVE" || d.status === "COMPLETION_REVIEW"),
    [dealRooms]
  );

  const completedDealRoomsCount = useMemo(
    () => (dealRooms || []).filter((d) => d.status === "COMPLETED").length,
    [dealRooms]
  );

  // Verified approved milestones count across user's deal rooms
  const verifiedMilestonesCount = useMemo(() => {
    let count = 0;
    Object.values(roomMilestonesMap).forEach((mList) => {
      (mList.items || []).forEach((m) => {
        if (m.status === "APPROVED") {
          count += 1;
        }
      });
    });
    return count;
  }, [roomMilestonesMap]);

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1 · UNIFIED WELCOME & PARTICIPATION HEADER                                 */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 -mb-10 h-48 w-48 rounded-full bg-violet-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Unified Opportunity Network</span>
              <span className="text-indigo-200">·</span>
              <span>One Account, Both Paths</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {currentUser?.full_name || currentUser?.email?.split("@")[0] || "Partner"}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Connect your ideas, business problems, skills, and resources. Seek solutions from verified collaborators or contribute capabilities to high-potential commercial ventures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPostNeed}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Post a Business Need</span>
            </button>
            <button
              type="button"
              onClick={onOfferCapability}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Lightbulb className="h-4 w-4" />
              <span>List a Capability</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2 · DUAL-PATH QUICK ACTION CARDS                                           */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Path A: I Need a Solution */}
        <div className="group rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Search className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
              {activeNeedsCount} Active Needs
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <h2 className="text-lg font-extrabold text-slate-900">
              I Need a Solution
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find developers, technology partners, funding intros, services, and strategic resources to build or expand your business idea.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onPostNeed}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Post a Need</span>
            </button>
            <button
              type="button"
              onClick={() => onBrowseOpportunities("needs")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Browse Collaborators</span>
            </button>
          </div>
        </div>

        {/* Path B: I Have Capabilities to Offer */}
        <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-100">
              <Lightbulb className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {activeCapsCount} Active Capabilities
            </span>
          </div>
          <div className="mt-4 space-y-1.5">
            <h2 className="text-lg font-extrabold text-slate-900">
              I Have Capabilities to Offer
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Discover real commercial needs where your skills, products, consulting services, or infrastructure can turn ideas into revenue.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onOfferCapability}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>List Capabilities</span>
            </button>
            <button
              type="button"
              onClick={() => onBrowseOpportunities("capabilities")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Discover Needs</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3 · ACTIONABLE ALERTS & PRIORITY NOTIFICATIONS (Section-Independent)       */}
      {/* ========================================================================= */}
      <section aria-label="Actionable Alerts" className="space-y-3">
        {alertsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Checking actionable collaboration alerts...</span>
          </div>
        ) : alertsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between text-xs text-amber-900">
            <span>{alertsError}</span>
            <button
              type="button"
              onClick={loadAlertsData}
              className="font-bold underline hover:no-underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : totalAlertsCount > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Action Items Awaiting Your Attention ({totalAlertsCount})
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-amber-700">Verified workflow actions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Proposals Awaiting Action */}
              {actionableProposals.map((prop) => (
                <div
                  key={prop.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-amber-200 p-3.5 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {prop.status === "REVISION_REQUESTED"
                        ? "Revision Requested on Proposal"
                        : "Incoming Proposal to Review"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {prop.title || `Proposal #${prop.id}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onViewConnections}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              ))}

              {/* Incoming Connections */}
              {actionableConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-amber-200 p-3.5 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Connection Request from {conn.requester?.full_name || "Partner"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {conn.opportunity_title ? `Re: ${conn.opportunity_title}` : "General Collaboration"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onViewConnections}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
                  >
                    Respond
                  </button>
                </div>
              ))}

              {/* Milestones Awaiting Review */}
              {milestonesToReview.map(({ milestone, roomId, roomTitle }) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-amber-200 p-3.5 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Milestone Deliverables for Review
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {milestone.title} · {roomTitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDealRooms(roomId)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              ))}

              {/* Milestones Needing Revision */}
              {milestonesToRevise.map(({ milestone, roomId, roomTitle }) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-amber-200 p-3.5 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Milestone Revisions Requested
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {milestone.title} · {roomTitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDealRooms(roomId)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
                  >
                    Revise
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                All collaborations and reviews are currently up to date.
              </span>
            </div>
            <button
              type="button"
              onClick={loadAlertsData}
              className="text-slate-400 hover:text-slate-700 transition"
              title="Refresh alerts"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4 · MY OPPORTUNITIES & LISTINGS HUB                                        */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                My Opportunities & Capability Listings
              </h2>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {opportunities.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage what you are seeking and what you are offering under one unified account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setOppFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              oppFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Listings ({opportunities.length})
          </button>
          <button
            type="button"
            onClick={() => setOppFilter("needs")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              oppFilter === "needs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            Needs Seeking ({needsCount})
          </button>
          <button
            type="button"
            onClick={() => setOppFilter("capabilities")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              oppFilter === "capabilities"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Capabilities Offered ({capabilitiesCount})
          </button>
          <button
            type="button"
            onClick={() => setOppFilter("drafts")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              oppFilter === "drafts"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Drafts ({draftsCount})
          </button>
        </div>

        {/* Error notice if opportunities failed */}
        {oppError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold text-rose-900">Unable to load opportunities</p>
                <p className="text-rose-700 mt-0.5">
                  We couldn&apos;t load your opportunity drafts right now. Please check your connection or try again.
                </p>
              </div>
              {onRetryOpps && (
                <button
                  type="button"
                  onClick={onRetryOpps}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer self-start sm:self-auto"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid of Opportunities */}
        {isLoadingOpps ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Loading your opportunities...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">No opportunities found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? "No listings match your search query."
                  : oppFilter === "needs"
                  ? "You haven't posted any business needs yet."
                  : oppFilter === "capabilities"
                  ? "You haven't listed any capability profiles yet."
                  : "You haven't created any opportunities yet."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onPostNeed}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
              >
                + Post a Need
              </button>
              <button
                type="button"
                onClick={onOfferCapability}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
              >
                + List a Capability
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpportunities.map((opp) => {
              const isNeed = opp.intent === "SEEKING_SOLUTION";
              return (
                <div
                  key={opp.id}
                  onClick={() => onSelectOpportunity(opp)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${
                          isNeed
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isNeed ? "Need Solution" : "Capability"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {opp.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                        {opp.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {opp.original_description || opp.proposed_solution || opp.problem_statement}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{opp.industry || opp.category || "General"}</span>
                    <span className="font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      Manage <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5 · TWO-WAY AI RECOMMENDATIONS (Both Matchmaking Directions)              */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Two-Way Intelligent Recommendations
              </h2>
              <p className="text-xs text-slate-500">
                AI matches compatible partners for your business needs and commercial opportunities for your capabilities.
              </p>
            </div>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setRecsTab("partners")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                recsTab === "partners"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Partners for Your Needs
            </button>
            <button
              type="button"
              onClick={() => setRecsTab("opportunities")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                recsTab === "opportunities"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Opportunities for Your Skills
            </button>
          </div>
        </div>

        {/* Direction 1: Partners for Your Needs */}
        {recsTab === "partners" && (
          <div className="space-y-3 pt-1">
            {publishedSeekingOpps.length > 0 ? (
              <div className="space-y-3">
                {/* Opportunity Context Dropdown if user has multiple seeking opportunities */}
                {publishedSeekingOpps.length > 1 && (
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-600">Need Context:</span>
                    <select
                      value={selectedSeekingOppId || ""}
                      onChange={(e) => setSelectedSeekingOppId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {publishedSeekingOpps.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                          {opp.title} ({opp.category || "General"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {partnerLoading ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    <span className="text-xs text-slate-500 font-semibold">
                      Matching compatible partners and specialists...
                    </span>
                  </div>
                ) : partnerError ? (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs flex items-center justify-between text-amber-900">
                    <span>{partnerError}</span>
                    <button
                      type="button"
                      onClick={() => selectedSeekingOppId && loadPartnerMatches(selectedSeekingOppId)}
                      className="font-bold underline hover:no-underline cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                ) : partnerMatches && partnerMatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {partnerMatches.map((cand, idx) => {
                      const tier = cand.explanation?.match_tier || "MODERATE_MATCH";
                      const tierLabel =
                        tier === "STRONG_MATCH"
                          ? "Strong Match"
                          : tier === "MODERATE_MATCH"
                          ? "Moderate Match"
                          : "Exploratory Match";
                      const tierColor =
                        tier === "STRONG_MATCH"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200";

                      return (
                        <div
                          key={cand.id || idx}
                          className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 hover:bg-slate-50 transition space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${tierColor}`}
                              >
                                {tierLabel}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 capitalize">
                                {cand.participant_type?.toLowerCase() || "participant"}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                {cand.name}
                              </h4>
                              {cand.headline && (
                                <p className="text-[11px] text-slate-600 line-clamp-1">
                                  {cand.headline}
                                </p>
                              )}
                              <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {cand.explanation?.explanation_summary}
                              </p>
                            </div>

                            {cand.skills && cand.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {cand.skills.slice(0, 3).map((skill, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-[10px] text-slate-600"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400">
                              {cand.industry || cand.location || "Available"}
                            </span>
                            <button
                              type="button"
                              onClick={onViewConnections}
                              className="font-bold text-indigo-600 hover:text-indigo-800 transition"
                            >
                              Connect &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No matching partner profiles found for this business need yet. Try adjusting required skills or criteria.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2">
                <p className="text-xs text-slate-600 font-semibold">
                  No published business needs found.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Post and publish a business problem or project need to receive AI-recommended partners and capabilities.
                </p>
                <button
                  type="button"
                  onClick={onPostNeed}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Post a Business Need</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Direction 2: Opportunities for Your Skills */}
        {recsTab === "opportunities" && (
          <div className="space-y-3 pt-1">
            {skillLoading ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500 font-semibold">
                  Matching commercial needs aligned with your registered capabilities...
                </span>
              </div>
            ) : skillError ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs flex items-center justify-between text-amber-900">
                <span>{skillError}</span>
                <button
                  type="button"
                  onClick={loadSkillMatches}
                  className="font-bold underline hover:no-underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : skillMatches && skillMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillMatches.map((oppMatch, idx) => {
                  const tier = oppMatch.explanation?.match_tier || "MODERATE_MATCH";
                  const tierLabel =
                    tier === "STRONG_MATCH"
                      ? "Strong Match"
                      : tier === "MODERATE_MATCH"
                      ? "Moderate Match"
                      : "Exploratory Match";
                  const tierColor =
                    tier === "STRONG_MATCH"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200";

                  return (
                    <div
                      key={oppMatch.id || idx}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 hover:bg-slate-50 transition space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${tierColor}`}
                          >
                            {tierLabel}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {oppMatch.category || "Tech"}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {oppMatch.title}
                          </h4>
                          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {oppMatch.explanation?.explanation_summary || oppMatch.value_proposition}
                          </p>
                        </div>

                        {oppMatch.required_skills_and_resources &&
                          oppMatch.required_skills_and_resources.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {oppMatch.required_skills_and_resources.slice(0, 3).map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-[10px] text-slate-600"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400">
                          {oppMatch.industry || "Commercial Need"}
                        </span>
                        <button
                          type="button"
                          onClick={() => onBrowseOpportunities("all")}
                          className="font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          View Need &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2">
                <p className="text-xs text-slate-600 font-semibold">
                  No matching commercial opportunities found.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add skills, services, and experience to your individual and organization profile to unlock targeted AI opportunity recommendations.
                </p>
                {onCompleteProfile && (
                  <button
                    type="button"
                    onClick={onCompleteProfile}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Complete Profile Skills</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6 · ACTIVE DEAL ROOMS WITH REAL MILESTONE PROGRESS                         */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Rooms summary (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Active Deal Rooms</h3>
                <p className="text-xs text-slate-500">
                  Agreed commercial milestones and verified deliverable executions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenDealRooms()}
              className="text-xs font-bold text-violet-600 hover:text-violet-800 transition cursor-pointer"
            >
              View All ({dealRooms?.length || 0}) &rarr;
            </button>
          </div>

          {dealRoomsLoading ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              <span className="text-xs text-slate-500 font-semibold">Loading Deal Rooms and milestones...</span>
            </div>
          ) : dealRoomsError ? (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs flex items-center justify-between text-rose-900">
              <span>{dealRoomsError}</span>
              <button
                type="button"
                onClick={loadDealRoomsData}
                className="font-bold underline hover:no-underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : activeDealRooms.length > 0 ? (
            <div className="space-y-3 pt-1">
              {activeDealRooms.slice(0, 3).map((room) => {
                const milestonesInfo = roomMilestonesMap[room.id];
                const totalM = milestonesInfo?.total ?? 0;
                // Requirement 4: Only APPROVED milestones count as completed
                const approvedM = (milestonesInfo?.items || []).filter((m) => m.status === "APPROVED").length;
                const hasMilestones = totalM > 0;
                const progressPercent = hasMilestones ? Math.round((approvedM / totalM) * 100) : 0;

                // Active milestone
                const activeMilestone = (milestonesInfo?.items || []).find(
                  (m) => m.status !== "APPROVED" && m.status !== "REJECTED"
                );

                return (
                  <div
                    key={room.id}
                    onClick={() => onOpenDealRooms(room.id)}
                    className="rounded-xl border border-slate-200/90 p-4 hover:bg-slate-50 transition cursor-pointer space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Deal Room #{room.id} · {room.title || room.opportunity_title || "Commercial Agreement"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Agreed Budget: {room.agreed_currency || "USD"} {room.agreed_budget_amount || "0.00"}
                        </p>
                      </div>
                      <span className="self-start sm:self-auto inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 border border-violet-200">
                        {room.status}
                      </span>
                    </div>

                    {/* Milestone Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">
                          {hasMilestones
                            ? `${approvedM} of ${totalM} milestones approved`
                            : "Pending milestone initialization"}
                        </span>
                        <span className="font-bold text-violet-700">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-violet-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Active Milestone Status */}
                    {activeMilestone && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Current: {activeMilestone.title}</span>
                        <span className="font-bold text-indigo-600 capitalize">
                          {activeMilestone.status.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No active Deal Rooms yet. Connect with partners and negotiate proposals to initiate Deal Room collaboration.
            </div>
          )}
        </div>

        {/* Trust & Reputation Card (1 col) - Factual & Non-Misleading */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Trust & Activity Record</h3>
                <p className="text-xs text-slate-500">Verified platform activity and milestones</p>
              </div>
            </div>

            {trustLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading trust records...</div>
            ) : trustError ? (
              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                <span>{trustError}</span>
                <button
                  type="button"
                  onClick={loadTrustData}
                  className="font-bold underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {/* 1. Profile Completeness */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Profile Completeness</span>
                    <span className="font-bold text-slate-900">
                      {individualProfile?.completeness_percent ?? 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1">
                    <div
                      className="bg-indigo-600 h-1 rounded-full"
                      style={{ width: `${individualProfile?.completeness_percent ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* 2. Approved Milestones History */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-600">Approved Milestones</span>
                  <span className="font-bold text-slate-900">
                    {verifiedMilestonesCount > 0 ? (
                      <span className="text-emerald-700 font-extrabold">{verifiedMilestonesCount} Approved</span>
                    ) : (
                      <span className="text-slate-400 font-normal">0 recorded</span>
                    )}
                  </span>
                </div>

                {/* 3. Concluded Deal Rooms */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-600">Completed Agreements</span>
                  <span className="font-bold text-slate-900">
                    {completedDealRoomsCount > 0 ? (
                      <span className="text-violet-700 font-extrabold">{completedDealRoomsCount} Completed</span>
                    ) : (
                      <span className="text-slate-400 font-normal">0 completed</span>
                    )}
                  </span>
                </div>

                {verifiedMilestonesCount === 0 && completedDealRoomsCount === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center pt-1">
                    Activity records begin once agreed milestones are submitted and approved.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCompleteProfile}
            className="w-full mt-2 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            Manage Profile Capabilities
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7 · COMMERCIAL LEDGER SUMMARY (Factual Settlement Overview)               */}
      {/* ========================================================================= */}
      {overview?.totals && (
        <section aria-label="Commercial Ledger Summary" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Commercial Settlement Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Recorded commercial transactions and milestone settlements.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onViewLedger}
              className="self-start sm:self-auto text-xs font-bold text-amber-800 hover:text-amber-900 transition cursor-pointer"
            >
              Open Full Ledger &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Settled Commercial Volume
              </span>
              <p className="text-lg font-extrabold text-slate-900">
                {overview.totals.currency} {overview.totals.total_revenue}
              </p>
              <p className="text-[10px] text-slate-400">
                {overview.totals.completed_count} completed settlement transaction{overview.totals.completed_count !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Settlements
              </span>
              <p className="text-lg font-extrabold text-amber-700">
                {overview.totals.currency} {overview.totals.pending_total}
              </p>
              <p className="text-[10px] text-slate-400">
                {overview.totals.pending_count} transaction{overview.totals.pending_count !== 1 ? "s" : ""} pending execution
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Payment Environment
              </span>
              <p className="text-sm font-bold text-slate-800">
                Configured by the server
              </p>
              <p className="text-[10px] text-slate-500">
                Confirm whether the backend uses PayPal Sandbox or Live before checkout.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
