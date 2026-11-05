"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Users,
  Building2,
  UserCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  MapPin,
  Briefcase,
} from "lucide-react";
import { ParticipantCandidate, ParticipantMatchesResponse } from "@/types";
import { fetchOpportunityCandidates } from "@/lib/api";
import { MatchRationaleCard } from "@/components/matching/MatchRationaleCard";

interface CandidateRecommendationsModalProps {
  isOpen: boolean;
  opportunityId: string | null;
  opportunityTitle?: string;
  onClose: () => void;
}

export const CandidateRecommendationsModal: React.FC<
  CandidateRecommendationsModalProps
> = ({ isOpen, opportunityId, opportunityTitle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ParticipantMatchesResponse | null>(null);

  useEffect(() => {
    if (!isOpen || !opportunityId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    async function loadCandidates() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOpportunityCandidates(opportunityId!);
        if (isMounted) {
          setData(res);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : "Unable to load candidates.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, [isOpen, opportunityId]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="candidate-recommendations-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Candidate Collaborators & Providers
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-md">
                For: {opportunityTitle || "Published Opportunity"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Human Agency / Advisory Notice Banner */}
        <div className="bg-amber-50/80 px-6 py-2.5 border-b border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="font-semibold">Advisory Recommendations:</strong>{" "}
            Candidates are suggested based on verified skills and declared services.
            Proposal drafting, negotiations, and milestone agreements will be managed in
            the upcoming <em>AI Deal Room</em>.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-500">
                Analyzing complementary capabilities across the PayPilot network...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button
                onClick={() => {
                  if (opportunityId) {
                    setLoading(true);
                    fetchOpportunityCandidates(opportunityId)
                      .then(setData)
                      .catch((err) => setError(err.message))
                      .finally(() => setLoading(false));
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:underline cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {!loading && !error && data && Array.isArray(data.items) && data.items.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  No matching candidates identified yet
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  As more professionals and organizations register capabilities in this
                  domain, relevant matches will appear automatically.
                </p>
              </div>
            </div>
          )}

          {!loading &&
            !error &&
            data &&
            Array.isArray(data.items) &&
            data.items.length > 0 &&
            data.items.map((candidate: ParticipantCandidate, idx: number) => {
              const isBiz = candidate.participant_type === "BUSINESS";
              return (
                <div
                  key={`${candidate.participant_type}-${candidate.id}-${idx}`}
                  data-testid="candidate-card"
                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3 hover:border-slate-300 transition"
                >
                  {/* Candidate Identity Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isBiz
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}
                      >
                        {isBiz ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <UserCheck className="h-5 w-5" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">
                            {candidate.name}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                              isBiz
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isBiz ? "Organization" : "Professional"}
                          </span>
                        </div>
                        {candidate.headline && (
                          <p className="text-[11px] text-slate-600 line-clamp-1">
                            {candidate.headline}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          {candidate.industry && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {candidate.industry}
                            </span>
                          )}
                          {candidate.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {candidate.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills & Services Pills */}
                  {(candidate.skills.length > 0 || candidate.services.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {candidate.skills.slice(0, 5).map((sk, sIdx) => (
                        <span
                          key={sIdx}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {sk}
                        </span>
                      ))}
                      {candidate.services.slice(0, 3).map((srv, srvIdx) => (
                        <span
                          key={srvIdx}
                          className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Grounded Rationale Card */}
                  <MatchRationaleCard
                    explanation={candidate.explanation}
                    compact={true}
                  />
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            {data ? `${data.total} qualified candidates identified` : ""}
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

