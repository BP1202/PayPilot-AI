"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Handshake,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Eye,
  Undo2,
  User,
} from "lucide-react";
import {
  Connection,
  ConnectionStatus,
  ConnectionIntent,
  Proposal,
  ProposalStatus,
  User as UserType,
} from "@/types";
import {
  fetchConnectionRequests,
  respondToConnectionRequest,
  withdrawConnectionRequest,
  fetchAcceptedConnections,
  fetchProposals,
} from "@/lib/api";
import { CreateProposalModal } from "@/components/proposals/CreateProposalModal";
import { ProposalDetailModal } from "@/components/proposals/ProposalDetailModal";

const INTENT_LABELS: Record<ConnectionIntent, string> = {
  EXPLORE_COLLABORATION: "Explore Collaboration",
  OFFER_CAPABILITY: "Offer Capability",
  SEEK_ASSISTANCE: "Seek Assistance",
  CO_FOUNDER: "Co-Founder",
  PARTNERSHIP: "Partnership",
};

const STATUS_BADGE: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  DECLINED: {
    label: "Declined",
    className: "bg-red-50 text-red-800 border-red-200",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const PROPOSAL_STATUS_BADGE: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-800 border-red-200",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

type TabId = "incoming" | "sent" | "connections" | "proposals";

interface ConnectionsProposalsViewProps {
  currentUser: UserType | null;
  onOpenAuth: () => void;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2 animate-pulse">
      <div className="h-3 w-1/3 bg-slate-200 rounded" />
      <div className="h-2 w-2/3 bg-slate-100 rounded" />
      <div className="h-2 w-1/2 bg-slate-100 rounded" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center space-y-2">
      <AlertCircle className="h-5 w-5 text-red-500 mx-auto" />
      <p className="text-xs font-semibold text-red-800">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:underline cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// --------------- Incoming Requests Tab ---------------

function IncomingTab({
  currentUser,
  onConnectionUpdate,
}: {
  currentUser: UserType;
  onConnectionUpdate: () => void;
}) {
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchConnectionRequests("incoming", "PENDING");
      setItems(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load incoming requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async (
    connectionId: string,
    action: "ACCEPT" | "DECLINE"
  ) => {
    setResponding(connectionId);
    try {
      await respondToConnectionRequest(connectionId, {
        action,
        response_note: responseNotes[connectionId] || null,
      });
      await load();
      onConnectionUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to respond.");
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={ArrowDownLeft}
        title="No pending incoming requests"
        description="When someone sends you a connection request, it will appear here."
      />
    );

  return (
    <div className="space-y-4">
      {items.map((conn) => (
        <div
          key={conn.id}
          data-testid="incoming-request-card"
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 transition"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                {getInitials(conn.requester.full_name)}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900">
                  {conn.requester.full_name ?? "Unknown"}
                </p>
                {conn.requester.headline && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {conn.requester.headline}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold">
                    {INTENT_LABELS[conn.intent]}
                  </span>
                  {conn.opportunity_title && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      Re: {conn.opportunity_title}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">
              {formatDate(conn.created_at)}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            {conn.message}
          </p>

          <div className="space-y-2">
            <textarea
              rows={2}
              placeholder="Optional response note..."
              value={responseNotes[conn.id] ?? ""}
              onChange={(e) =>
                setResponseNotes((prev) => ({ ...prev, [conn.id]: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-300 focus:outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRespond(conn.id, "ACCEPT")}
                disabled={responding === conn.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
              >
                {responding === conn.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Accept
              </button>
              <button
                onClick={() => handleRespond(conn.id, "DECLINE")}
                disabled={responding === conn.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Decline
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --------------- Sent Requests Tab ---------------

function SentTab({ currentUser }: { currentUser: UserType }) {
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchConnectionRequests("outgoing");
      setItems(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sent requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleWithdraw = async (connectionId: string) => {
    setWithdrawing(connectionId);
    try {
      await withdrawConnectionRequest(connectionId);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to withdraw.");
    } finally {
      setWithdrawing(null);
    }
  };

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={ArrowUpRight}
        title="No sent requests"
        description="Connection requests you've sent to others will appear here."
      />
    );

  return (
    <div className="space-y-4">
      {items.map((conn) => {
        const badge = STATUS_BADGE[conn.status];
        return (
          <div
            key={conn.id}
            data-testid="sent-request-card"
            className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 hover:border-slate-300 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {getInitials(conn.recipient.full_name)}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">
                    {conn.recipient.full_name ?? "Unknown"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      {INTENT_LABELS[conn.intent]}
                    </span>
                    {conn.opportunity_title && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Re: {conn.opportunity_title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {formatDate(conn.created_at)}
              </span>
            </div>

            <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              {conn.message}
            </p>

            {conn.status === "PENDING" && (
              <button
                onClick={() => handleWithdraw(conn.id)}
                disabled={withdrawing === conn.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                {withdrawing === conn.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
                Withdraw
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --------------- Connections Tab ---------------

function ConnectionsTab({
  currentUser,
  onCreateProposal,
}: {
  currentUser: UserType;
  onCreateProposal: (connection: Connection) => void;
}) {
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAcceptedConnections();
      setItems(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={Handshake}
        title="No accepted connections yet"
        description="Once a connection request is accepted, it will appear here and you can create proposals."
      />
    );

  return (
    <div className="space-y-4">
      {items.map((conn) => {
        const isRequester = conn.requester.user_id === currentUser.id;
        const counterpart = isRequester ? conn.recipient : conn.requester;
        return (
          <div
            key={conn.id}
            data-testid="accepted-connection-card"
            className="rounded-xl border border-emerald-200 bg-white p-4 space-y-3 hover:border-emerald-300 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                  {getInitials(counterpart.full_name)}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">
                    {counterpart.full_name ?? "Unknown"}
                  </p>
                  {counterpart.headline && (
                    <p className="text-[11px] text-slate-500">
                      {counterpart.headline}
                    </p>
                  )}
                  {counterpart.industry && (
                    <p className="text-[10px] text-slate-400">{counterpart.industry}</p>
                  )}
                  {counterpart.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {counterpart.skills.slice(0, 5).map((sk, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {conn.accepted_at && (
                <span className="text-[10px] text-slate-400 shrink-0">
                  Since {formatDate(conn.accepted_at)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onCreateProposal(conn)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Proposal
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --------------- Proposals Tab ---------------

function ProposalsTab({
  currentUser,
  onViewProposal,
}: {
  currentUser: UserType;
  onViewProposal: (proposal: Proposal) => void;
}) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"all" | "sent" | "received">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProposals(role);
      setItems(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load proposals.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-4">
      {/* Role toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start w-fit">
        {(["all", "sent", "received"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer capitalize ${
              role === r
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && items.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Proposals you send or receive through accepted connections will appear here."
        />
      )}

      {!error &&
        items.map((proposal) => {
          const badge = PROPOSAL_STATUS_BADGE[proposal.status];
          const isSender = proposal.proposer.user_id === currentUser.id;
          const counterpart = isSender ? proposal.recipient : proposal.proposer;
          return (
            <div
              key={proposal.id}
              data-testid="proposal-card"
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 hover:border-indigo-200 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {proposal.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      v{proposal.current_version}
                    </span>
                    {proposal.budget_amount && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {proposal.currency} {proposal.budget_amount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isSender ? "To:" : "From:"}{" "}
                    <span className="font-semibold">
                      {counterpart.full_name ?? "Unknown"}
                    </span>
                  </p>
                  {proposal.opportunity_title && (
                    <p className="text-[10px] text-slate-400">
                      Re: {proposal.opportunity_title}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatDate(proposal.created_at)}
                </span>
              </div>

              <button
                onClick={() => onViewProposal(proposal)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Details
              </button>
            </div>
          );
        })}
    </div>
  );
}

// --------------- Main View ---------------

export const ConnectionsProposalsView: React.FC<ConnectionsProposalsViewProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("incoming");
  const [createProposalFor, setCreateProposalFor] = useState<Connection | null>(null);
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);
  const [connectionsVersion, setConnectionsVersion] = useState(0);

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: "incoming", label: "Incoming", icon: ArrowDownLeft },
    { id: "sent", label: "Sent", icon: ArrowUpRight },
    { id: "connections", label: "Connections", icon: Users },
    { id: "proposals", label: "Proposals", icon: FileText },
  ];

  if (!currentUser) {
    return (
      <div
        data-testid="connections-auth-prompt"
        className="flex flex-col items-center justify-center py-20 space-y-4 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <Handshake className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Connections &amp; Proposals
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Sign in to manage your connections, review requests, and collaborate through proposals.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="connections-proposals-view">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Handshake className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Connections &amp; Proposals
          </h1>
          <p className="text-xs text-slate-500">
            Manage your collaboration network and deal proposals
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer -mb-px ${
                isActive
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "incoming" && (
          <IncomingTab
            currentUser={currentUser}
            onConnectionUpdate={() => setConnectionsVersion((v) => v + 1)}
          />
        )}
        {activeTab === "sent" && <SentTab currentUser={currentUser} />}
        {activeTab === "connections" && (
          <ConnectionsTab
            key={connectionsVersion}
            currentUser={currentUser}
            onCreateProposal={(conn) => setCreateProposalFor(conn)}
          />
        )}
        {activeTab === "proposals" && (
          <ProposalsTab
            currentUser={currentUser}
            onViewProposal={(p) => setViewProposal(p)}
          />
        )}
      </div>

      {/* Create Proposal Modal */}
      {createProposalFor && (
        <CreateProposalModal
          isOpen={true}
          onClose={() => setCreateProposalFor(null)}
          connection={createProposalFor}
          currentUser={currentUser}
          onSuccess={() => {
            setCreateProposalFor(null);
            setActiveTab("proposals");
          }}
        />
      )}

      {/* Proposal Detail Modal */}
      {viewProposal && (
        <ProposalDetailModal
          isOpen={true}
          onClose={() => setViewProposal(null)}
          proposal={viewProposal}
          currentUser={currentUser}
          onUpdate={(updated) => setViewProposal(updated)}
        />
      )}
    </div>
  );
};
