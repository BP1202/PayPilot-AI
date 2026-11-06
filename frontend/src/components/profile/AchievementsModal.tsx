"use client";

import React from "react";
import {
  Award,
  CheckCircle2,
  Shield,
  Star,
  Users,
  Briefcase,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { User } from "@/types";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  activeRole?: "seeker" | "creator";
  onViewProfile?: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeRole = "seeker",
  onViewProfile,
}) => {
  if (!isOpen) return null;

  const isSeeker = activeRole === "seeker";

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "OP";
  };

  const achievements = [
    {
      icon: Shield,
      title: "Verified Network Identity",
      badge: "Verified Member",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description:
        "Cryptographically anchored 1:1 participant record with tamper-proof identity privacy controls.",
    },
    {
      icon: Star,
      title: "Profile Completeness",
      badge: "100% Complete",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      description:
        "Professional headline, industry categorization, verified skills, and collaboration preferences active.",
    },
    {
      icon: Users,
      title: "Network Standing",
      badge: "Pro Standing",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
      description:
        "Adheres to the Opnly Zero-Invention Guarantee and verifiable proposal negotiation standards.",
    },
    {
      icon: Briefcase,
      title: "Deal Room Commercial Readiness",
      badge: "Authorized",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      description:
        "Authorized for dual-party milestone breakdowns, deliverable reviews, and escrow milestone release.",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close achievements modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 id="achievements-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
              Achievements & Credentials
            </h2>
            <p className="text-xs text-slate-500">
              Verified platform standing and commercial capability badges.
            </p>
          </div>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ${
                  isSeeker
                    ? "bg-gradient-to-tr from-blue-600 to-indigo-600 ring-2 ring-blue-200"
                    : "bg-gradient-to-tr from-emerald-600 to-teal-600 ring-2 ring-emerald-200"
                }`}
              >
                {getInitials(currentUser.full_name, currentUser.email)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {currentUser.full_name || currentUser.email.split("@")[0]}
                </p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                isSeeker
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isSeeker ? "Seeker (Blue Mode)" : "Creator (Green Mode)"}
            </span>
          </div>
        )}

        {/* Badges Grid */}
        <div className="space-y-3">
          {achievements.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 transition"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {onViewProfile && (
            <button
              onClick={() => {
                onClose();
                onViewProfile();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              <span>Manage Profile & Skills</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

