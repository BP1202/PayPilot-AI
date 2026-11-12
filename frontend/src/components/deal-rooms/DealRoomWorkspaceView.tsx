"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  HelpCircle,
  Layers,
  MessageSquare,
  PauseCircle,
  Pin,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
  ExternalLink,
  Lock,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  DealRoom,
  DealRoomActivity,
  DealRoomClarification,
  DealRoomDocument,
  DealRoomDocumentType,
  DealRoomNote,
  DealRoomOverview,
  DealRoomStatus,
  User,
} from "@/types";
import {
  fetchDealRoomById,
  fetchDealRoomOverview,
  updateDealRoomStatus,
  fetchDealRoomNotes,
  createDealRoomNote,
  fetchDealRoomClarifications,
  createDealRoomClarification,
  answerDealRoomClarification,
  fetchDealRoomDocuments,
  createDealRoomDocument,
  deleteDealRoomDocument,
  fetchDealRoomActivities,
} from "@/lib/api";
import { MilestoneExecutionWorkspace } from "./MilestoneExecutionWorkspace";

interface DealRoomWorkspaceViewProps {
  roomId: string;
  currentUser?: User | null;
  onBackToList: () => void;
}

type WorkspaceTab =
  | "OVERVIEW"
  | "AGREED_TERMS"
  | "MILESTONES"
  | "DOCUMENTS"
  | "NOTES_CLARIFICATIONS";

export const DealRoomWorkspaceView: React.FC<DealRoomWorkspaceViewProps> = ({
  roomId,
  currentUser,
  onBackToList,
}) => {
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [overview, setOverview] = useState<DealRoomOverview | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Child collections
  const [notes, setNotes] = useState<DealRoomNote[]>([]);
  const [clarifications, setClarifications] = useState<DealRoomClarification[]>([]);
  const [documents, setDocuments] = useState<DealRoomDocument[]>([]);
  const [activities, setActivities] = useState<DealRoomActivity[]>([]);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<DealRoomStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [notePinned, setNotePinned] = useState(false);

  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");

  const [answeringClarId, setAnsweringClarId] = useState<string | null>(null);
  const [clarificationAnswerText, setClarificationAnswerText] = useState("");

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<DealRoomDocumentType>("REFERENCE_LINK");
  const [docUrl, setDocUrl] = useState("");
  const [docDesc, setDocDesc] = useState("");

  const loadRoomData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomData, overviewData] = await Promise.all([
        fetchDealRoomById(roomId),
        fetchDealRoomOverview(roomId),
      ]);
      setRoom(roomData);
      setOverview(overviewData);
      if (roomData?.id && roomData.id !== roomId && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.get("room_id") === roomId) {
          url.searchParams.set("room_id", roomData.id);
          window.history.replaceState({}, "", url.toString());
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Deal Room workspace";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  const loadTabContent = async (tab: WorkspaceTab) => {
    setActiveTab(tab);
    const targetRoomId = room?.id || roomId;
    try {
      if (tab === "NOTES_CLARIFICATIONS") {
        const [nList, cList] = await Promise.all([
          fetchDealRoomNotes(targetRoomId),
          fetchDealRoomClarifications(targetRoomId),
        ]);
        setNotes(nList);
        setClarifications(cList);
      } else if (tab === "DOCUMENTS") {
        const dList = await fetchDealRoomDocuments(targetRoomId);
        setDocuments(dList);
      } else if (tab === "OVERVIEW") {
        const aList = await fetchDealRoomActivities(targetRoomId);
        setActivities(aList);
      }
    } catch (err) {
      console.error("Failed to load tab data", err);
    }
  };

  const handleStatusTransition = async () => {
    if (!targetStatus) return;
    setStatusActionLoading(true);
    const targetRoomId = room?.id || roomId;
    try {
      const updated = await updateDealRoomStatus(targetRoomId, {
        status: targetStatus,
        reason: statusReason.trim() || undefined,
      });
      setRoom(updated);
      setIsStatusModalOpen(false);
      setStatusReason("");
      setTargetStatus(null);
      await loadRoomData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    const targetRoomId = room?.id || roomId;
    try {
      await createDealRoomNote(targetRoomId, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        is_pinned: notePinned,
      });
      setNoteTitle("");
      setNoteContent("");
      setNotePinned(false);
      setIsNoteModalOpen(false);
      const updatedNotes = await fetchDealRoomNotes(targetRoomId);
      setNotes(updatedNotes);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add note");
    }
  };

  const handleAskClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationQuestion.trim()) return;
    const targetRoomId = room?.id || roomId;
    try {
      await createDealRoomClarification(targetRoomId, {
        question: clarificationQuestion.trim(),
      });
      setClarificationQuestion("");
      setIsClarificationModalOpen(false);
      const updatedClars = await fetchDealRoomClarifications(targetRoomId);
      setClarifications(updatedClars);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to ask clarification");
    }
  };

  const handleAnswerClarification = async (clarId: string) => {
    if (!clarificationAnswerText.trim()) return;
    const targetRoomId = room?.id || roomId;
    try {
      await answerDealRoomClarification(targetRoomId, clarId, clarificationAnswerText.trim());
      setAnsweringClarId(null);
      setClarificationAnswerText("");
      const updatedClars = await fetchDealRoomClarifications(targetRoomId);
      setClarifications(updatedClars);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit answer");
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docUrl.trim()) return;
    const targetRoomId = room?.id || roomId;
    try {
      await createDealRoomDocument(targetRoomId, {
        title: docTitle.trim(),
        document_type: docType,
        reference_url: docUrl.trim(),
        description: docDesc.trim() || undefined,
      });
      setDocTitle("");
      setDocUrl("");
      setDocDesc("");
      setIsDocModalOpen(false);
      const updatedDocs = await fetchDealRoomDocuments(targetRoomId);
      setDocuments(updatedDocs);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to attach document reference");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to remove this document reference?")) return;
    const targetRoomId = room?.id || roomId;
    try {
      await deleteDealRoomDocument(targetRoomId, docId);
      const updatedDocs = await fetchDealRoomDocuments(targetRoomId);
      setDocuments(updatedDocs);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3 bg-white rounded-3xl border border-slate-200">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Initializing Deal Room workspace...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-rose-600" />
          <h2 className="text-base font-bold">Access Denied or Room Not Found</h2>
        </div>
        <p className="text-xs">{error || "You do not have access to this Deal Room."}</p>
        <button
          onClick={onBackToList}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
        >
          Return to Deal Rooms
        </button>
      </div>
    );
  }

  const counterpart = room.participants.find((p) => p.user_id !== currentUser?.id);
  const myParticipant = room.participants.find((p) => p.user_id === currentUser?.id);

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={onBackToList}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Deal Rooms</span>
            </button>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {room.title}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100">
                Agreed Proposal
              </span>
            </div>
            {room.opportunity_title && (
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>Opportunity: {room.opportunity_title}</span>
              </p>
            )}
          </div>

          {/* Status Badge & Lifecycle Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                room.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : room.status === "ON_HOLD"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : room.status === "COMPLETION_REVIEW"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : room.status === "COMPLETED"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {room.status.replace("_", " ")}
            </span>

            {/* Transition Action Buttons */}
            {room.status === "ACTIVE" && (
              <>
                <button
                  onClick={() => {
                    setTargetStatus("ON_HOLD");
                    setIsStatusModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
                >
                  Hold
                </button>
                <button
                  onClick={() => {
                    setTargetStatus("COMPLETION_REVIEW");
                    setIsStatusModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Request Review
                </button>
              </>
            )}

            {room.status === "ON_HOLD" && (
              <button
                onClick={() => {
                  setTargetStatus("ACTIVE");
                  setIsStatusModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition cursor-pointer"
              >
                Resume Active
              </button>
            )}

            {room.status === "COMPLETION_REVIEW" && (
              <>
                <button
                  onClick={() => {
                    setTargetStatus("ACTIVE");
                    setIsStatusModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => {
                    setTargetStatus("COMPLETED");
                    setIsStatusModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Confirm & Complete
                </button>
              </>
            )}

            {room.status !== "COMPLETED" && room.status !== "CANCELLED" && (
              <button
                onClick={() => {
                  setTargetStatus("CANCELLED");
                  setIsStatusModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Status reason alert if present */}
        {room.status_reason && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Status note:</strong> {room.status_reason}
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          {[
            { id: "OVERVIEW", label: "Overview", icon: Layers },
            { id: "AGREED_TERMS", label: "Agreed Terms", icon: ShieldCheck },
            { id: "MILESTONES", label: "Deliverables & Milestones", icon: Calendar },
            { id: "DOCUMENTS", label: "Documents & References", icon: FileText },
            { id: "NOTES_CLARIFICATIONS", label: "Notes & Clarifications", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => loadTabContent(tab.id as WorkspaceTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "OVERVIEW" && overview && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Budget
              </span>
              <p className="text-base font-extrabold text-slate-900">
                {overview.total_budget
                  ? `$${Number(overview.total_budget).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}`
                  : "N/A"}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">{overview.currency}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Milestones
              </span>
              <p className="text-base font-extrabold text-slate-900">
                {overview.milestones_count}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Agreed stages</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Deliverables
              </span>
              <p className="text-base font-extrabold text-slate-900">
                {overview.deliverables_count}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Items to ship</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Timeline
              </span>
              <p className="text-base font-extrabold text-slate-900">
                {overview.estimated_duration_days
                  ? `${overview.estimated_duration_days} days`
                  : "Flexible"}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Estimated sprint</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Open Questions
              </span>
              <p className="text-base font-extrabold text-slate-900">
                {overview.open_clarifications_count}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Pending response</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Shared Documents
              </span>
              <p className="text-base font-extrabold text-slate-900">
                {overview.documents_count}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">References & specs</span>
            </div>
          </div>

          {/* Participants Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Authorized Collaboration Participants
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {room.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {p.name}
                      </span>
                      {p.user_id === currentUser?.id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-indigo-600">
                      {p.collaboration_role}
                    </p>
                    {p.assigned_responsibilities && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {p.assigned_responsibilities}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scope Preview & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scope Box */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Agreed Scope of Work</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {room.agreed_scope_of_work || "Scope details defined in proposal terms."}
              </p>
            </div>

            {/* Activity Stream */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Recent Workspace Activity</h3>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {overview.recent_activities.length === 0 ? (
                  <p className="text-xs text-slate-400">No activity recorded yet.</p>
                ) : (
                  overview.recent_activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-slate-900">{act.title}</p>
                        {act.details && <p className="text-slate-500 text-[11px]">{act.details}</p>}
                        <span className="text-[10px] text-slate-400">
                          {act.actor_name} · {new Date(act.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AGREED TERMS (READ-ONLY) */}
      {activeTab === "AGREED_TERMS" && (
        <div className="space-y-6">
          {/* Immutability Alert */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center gap-3 text-xs text-indigo-950 font-medium">
            <Lock className="h-5 w-5 text-indigo-600 shrink-0" />
            <div>
              <p className="font-bold">Immutable Agreement Record</p>
              <p className="text-slate-600 text-[11px]">
                These terms reflect the mutually accepted Proposal.
                Terms are strictly read-only to preserve contractual integrity between parties.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Scope of Work
              </h3>
              <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                {room.agreed_scope_of_work || "No scope text provided."}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Agreed Deliverables ({room.agreed_deliverables.length})
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {room.agreed_deliverables.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-xs text-slate-800 p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Assumptions
                </h3>
                {room.agreed_assumptions.length === 0 ? (
                  <p className="text-xs text-slate-400">None specified.</p>
                ) : (
                  <ul className="space-y-2">
                    {room.agreed_assumptions.map((ass, i) => (
                      <li key={i} className="text-xs text-slate-700 p-2.5 bg-slate-50 rounded-xl">
                        • {ass}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Conditions
                </h3>
                {room.agreed_conditions.length === 0 ? (
                  <p className="text-xs text-slate-400">None specified.</p>
                ) : (
                  <ul className="space-y-2">
                    {room.agreed_conditions.map((c, i) => (
                      <li key={i} className="text-xs text-slate-700 p-2.5 bg-slate-50 rounded-xl">
                        • {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {room.agreed_notes && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Agreement Notes
                </h3>
                <p className="text-xs text-slate-700 p-4 bg-slate-50 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {room.agreed_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERABLES & MILESTONES */}
      {activeTab === "MILESTONES" && (
        <MilestoneExecutionWorkspace
          roomId={room.id}
          currentUser={currentUser || null}
          agreedMilestones={room.agreed_milestones}
          currency={room.agreed_currency}
          onMilestoneUpdated={loadRoomData}
        />
      )}

      {/* TAB 4: DOCUMENTS & REFERENCES */}
      {activeTab === "DOCUMENTS" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Shared Documents & References
                </h3>
                <p className="text-xs text-slate-500">
                  Secure external specifications, design files, and review links shared between participants.
                </p>
              </div>
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Attach Reference</span>
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">No documents or reference links attached yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 transition shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {doc.document_type}
                        </span>
                        {doc.uploaded_by_id === currentUser?.id && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                            title="Delete Document Reference"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">{doc.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 truncate">
                        By {doc.uploader_name}
                      </span>
                      <a
                        href={doc.reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NOTES & CLARIFICATIONS */}
      {activeTab === "NOTES_CLARIFICATIONS" && (
        <div className="space-y-8">
          {/* Notes Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Shared Workspace Notes</h3>
                <p className="text-xs text-slate-500">
                  Collaborative notes, meeting summaries, and sprint reminders.
                </p>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center border border-dashed rounded-2xl">
                No notes created yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition shadow-sm space-y-2 ${
                      n.is_pinned
                        ? "bg-amber-50/40 border-amber-200/80"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {n.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />}
                        <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {n.author_name} · {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clarifications Q&A Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Questions & Clarifications
                </h3>
                <p className="text-xs text-slate-500">
                  Track technical questions, scope interpretations, and formal resolutions.
                </p>
              </div>
              <button
                onClick={() => setIsClarificationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Ask Question</span>
              </button>
            </div>

            {clarifications.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center border border-dashed rounded-2xl">
                No questions or clarifications logged yet.
              </p>
            ) : (
              <div className="space-y-4">
                {clarifications.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          c.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {c.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Asked by {c.asker_name} · {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900">{c.question}</p>

                    {/* Answer section */}
                    {c.status === "RESOLVED" && c.answer ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Answer ({c.answerer_name || "Counterpart"}):
                        </span>
                        <p className="text-slate-800">{c.answer}</p>
                      </div>
                    ) : answeringClarId === c.id ? (
                      <div className="space-y-2 pt-2">
                        <textarea
                          placeholder="Type resolution answer..."
                          value={clarificationAnswerText}
                          onChange={(e) => setClarificationAnswerText(e.target.value)}
                          rows={2}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setAnsweringClarId(null);
                              setClarificationAnswerText("");
                            }}
                            className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAnswerClarification(c.id)}
                            className="px-3.5 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                          >
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setAnsweringClarId(c.id);
                            setClarificationAnswerText("");
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                        >
                          Answer Question →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Lifecycle State Transition */}
      {isStatusModalOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900">
              Confirm Status Change: {targetStatus.replace("_", " ")}
            </h3>
            <p className="text-xs text-slate-500">
              Updating workspace status records an auditable activity visible to both participants.
            </p>

            {(targetStatus === "ON_HOLD" || targetStatus === "CANCELLED") && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Justification / Reason (Required)
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Provide reason for this change..."
                  rows={3}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setTargetStatus(null);
                  setStatusReason("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusTransition}
                disabled={statusActionLoading}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition cursor-pointer"
              >
                {statusActionLoading ? "Updating..." : "Confirm Transition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Note */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAddNote}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200"
          >
            <h3 className="text-base font-extrabold text-slate-900">Add Shared Note</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Title</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Kickoff discussion notes"
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Content</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your note..."
                rows={4}
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pinToggle"
                checked={notePinned}
                onChange={(e) => setNotePinned(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="pinToggle" className="text-xs font-bold text-slate-700">
                Pin to top of workspace
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Ask Clarification */}
      {isClarificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAskClarification}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200"
          >
            <h3 className="text-base font-extrabold text-slate-900">Ask a Question</h3>
            <p className="text-xs text-slate-500">
              Submit a formal technical question or scope inquiry to your collaboration counterpart.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Question</label>
              <textarea
                value={clarificationQuestion}
                onChange={(e) => setClarificationQuestion(e.target.value)}
                placeholder="e.g. Which cloud region should the production databases be hosted in?"
                rows={4}
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClarificationModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Submit Question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Attach Document Reference */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAddDocument}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200"
          >
            <h3 className="text-base font-extrabold text-slate-900">Attach Document Reference</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Title</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Figma Design Specification"
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DealRoomDocumentType)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SPECIFICATION">Specification / PRD</option>
                <option value="DESIGN">Design Asset / Prototype</option>
                <option value="REFERENCE_LINK">Reference Link</option>
                <option value="DELIVERABLE_DRAFT">Deliverable Draft</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Reference URL</label>
              <input
                type="url"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description (Optional)</label>
              <textarea
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                placeholder="Notes about this reference..."
                rows={2}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Attach Reference
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
