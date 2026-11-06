"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  FileText,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DealRoom, DealRoomStatus, User } from "@/types";
import { fetchDealRooms } from "@/lib/api";

interface DealRoomsListViewProps {
  currentUser?: User | null;
  onSelectRoom: (roomId: string) => void;
  onOpenBrowse?: () => void;
}

const STATUS_CONFIG: Record<
  DealRoomStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  ACTIVE: {
    label: "Active Collaboration",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  ON_HOLD: {
    label: "On Hold",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: PauseCircle,
  },
  COMPLETION_REVIEW: {
    label: "Under Completion Review",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    icon: Clock,
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: XCircle,
  },
};

export const DealRoomsListView: React.FC<DealRoomsListViewProps> = ({
  currentUser,
  onSelectRoom,
  onOpenBrowse,
}) => {
  const [rooms, setRooms] = useState<DealRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealRoomStatus | "ALL">("ALL");

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    if (!currentUser) {
      setLoading(false);
      setRooms([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDealRooms();
      setRooms(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Deal Rooms";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.opportunity_title &&
        r.opportunity_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Briefcase className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Deal Room Workspaces
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Sign in to access your collaboration workspaces, track milestones, and execute verified outcomes.
          </p>
        </div>
        <button
          onClick={onOpenBrowse}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
        >
          Explore Opportunities
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md text-indigo-200 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Deal Room Workspaces</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Collaboration Workspaces
          </h1>
          <p className="text-sm font-medium text-slate-300 leading-relaxed">
            Move from mutually accepted proposal terms into structured, auditable execution.
            Track milestones, share reference documents, resolve clarifications, and analyze progress with AI.
          </p>
        </div>
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Deal Rooms by title, scope, or opportunity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE", "ON_HOLD", "COMPLETION_REVIEW", "COMPLETED", "CANCELLED"] as const).map(
            (statusKey) => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === statusKey
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {statusKey === "ALL"
                  ? "All Rooms"
                  : statusKey === "COMPLETION_REVIEW"
                  ? "In Review"
                  : statusKey.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-white rounded-3xl border border-slate-200/80">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Loading your Deal Rooms...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
          <button
            onClick={loadRooms}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 rounded-xl text-xs font-bold text-rose-800 transition"
          >
            Retry
          </button>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl border border-slate-200/80 space-y-4 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Briefcase className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Deal Rooms Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Deal Rooms are automatically opened once both parties accept a proposal. Explore
              opportunities and negotiate agreements to initiate your next workspace.
            </p>
          </div>
          {onOpenBrowse && (
            <button
              onClick={onOpenBrowse}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
            >
              Browse Opportunities
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const statusMeta = STATUS_CONFIG[room.status];
            const StatusIcon = statusMeta.icon;
            const counterpart = room.participants.find(
              (p) => p.user_id !== currentUser?.id
            );

            return (
              <div
                key={room.id}
                className="group relative flex flex-col justify-between bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-200 overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Status & Version Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusMeta.label}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      v{room.accepted_proposal_version}
                    </span>
                  </div>

                  {/* Title & Opportunity */}
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                      {room.title}
                    </h3>
                    {room.opportunity_title && (
                      <p className="text-[11px] font-medium text-slate-400 line-clamp-1 flex items-center gap-1">
                        <Layers className="h-3 w-3 shrink-0" />
                        {room.opportunity_title}
                      </p>
                    )}
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>

                  {/* Counterpart Card */}
                  {counterpart && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {counterpart.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {counterpart.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {counterpart.collaboration_role}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metrics Badge Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-bold text-slate-900">
                        {room.agreed_budget_amount
                          ? `$${Number(room.agreed_budget_amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })} ${room.agreed_currency}`
                          : "Custom Budget"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {room.agreed_milestones.length}{" "}
                        {room.agreed_milestones.length === 1 ? "milestone" : "milestones"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => onSelectRoom(room.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition shadow-sm group-hover:shadow-md cursor-pointer"
                  >
                    <span>Enter Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

