"use client";

import React from "react";
import {
  Lightbulb,
  Sparkles,
  Briefcase,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

interface HowItWorksSectionProps {
  onGetStarted?: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onGetStarted }) => {
  const steps = [
    {
      step: "01",
      title: "Capture & Structure",
      desc: "Post a business need or idea. AI extracts structured models, skills, assumptions, and deliverables.",
      icon: Lightbulb,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-100",
    },
    {
      step: "02",
      title: "Intelligent Match",
      desc: "Our matchmaking engine pairs complementary creators, developers, and partners with transparent rationale.",
      icon: Sparkles,
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
    },
    {
      step: "03",
      title: "Deal Room",
      desc: "Collaborate in a private room. Negotiate proposals, scope, responsibilities, and timeline in one place.",
      icon: Briefcase,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-100",
    },
    {
      step: "04",
      title: "Mutual Agreement",
      desc: "Lock in milestone requirements and acceptance criteria with clear dual-party approval rules.",
      icon: FileCheck2,
      color: "text-teal-600",
      bg: "bg-teal-50 border-teal-100",
    },
    {
      step: "05",
      title: "Milestone Payouts",
      desc: "Funds are protected and released upon verified deliverable approval. No unearned payouts.",
      icon: ShieldCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <div
      data-testid="how-it-works-section"
      className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-6 sm:p-8 shadow-xs space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Lifecycle Journey
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
            How Opnly Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            From raw idea to mutual agreement and verified milestone completion.
          </p>
        </div>
        {onGetStarted && (
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer self-start sm:self-auto"
          >
            <span>Start an opportunity</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.bg} ${item.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

