"use client";

import React from "react";
import { ShieldCheck, UserCheck, Lock, History, CheckCircle2 } from "lucide-react";

export const TrustSecuritySection: React.FC = () => {
  const trustPillars = [
    {
      title: "Verified Profiles",
      desc: "Individuals and businesses build authenticated track records with transparent skill tags, past projects, and organization credentials.",
      icon: UserCheck,
      badge: "Identity Grounding",
    },
    {
      title: "Secure AI Deal Rooms",
      desc: "Private multi-stakeholder workspaces. Access-controlled document review and confidentiality by design before contracts are formed.",
      icon: Lock,
      badge: "Confidentiality First",
    },
    {
      title: "Milestone-Based Escrow",
      desc: "Commercial terms are locked into milestone stages. Payment authorization is tied strictly to verified deliverable approval.",
      icon: ShieldCheck,
      badge: "Dual-Party Approval",
    },
    {
      title: "Audit Trails & Dispute Defense",
      desc: "Immutable logs of proposal revisions, milestone submissions, and review decisions provide verifiable protection for both parties.",
      icon: History,
      badge: "Traceable History",
    },
  ];

  return (
    <div
      data-testid="trust-security-section"
      className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40 p-6 sm:p-8 shadow-xs space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Trust & Safeguards
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
            Built for Commercial Confidence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            How Opnly keeps opportunities authentic, collaborations secure, and payouts protected.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {trustPillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{pillar.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified System Standard</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

