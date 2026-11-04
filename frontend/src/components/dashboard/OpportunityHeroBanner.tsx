"use client";

import React from "react";
import { Handshake, CheckCircle2, Target, Rocket } from "lucide-react";
import { OpportunityIntent } from "@/types";

interface OpportunityHeroBannerProps {
  onQuickAction: (intent: OpportunityIntent) => void;
}

export const OpportunityHeroBanner: React.FC<OpportunityHeroBannerProps> = ({
  onQuickAction,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/60 p-6 sm:p-8 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Vision & Heading */}
        <div className="lg:col-span-4 space-y-2.5">
          <span className="text-xs font-bold tracking-wider uppercase text-indigo-600">
            PayPilot AI
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            The <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Idea-to-Business</span> Opportunity Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Connect with the right people — whether you need a solution, have an idea, or want to invest in innovation.
          </p>
        </div>

        {/* Center Column: Two-Sided Visual Connector */}
        <div className="lg:col-span-5 flex items-center justify-center py-2">
          <div className="relative flex items-center justify-center gap-3 sm:gap-6 w-full max-w-md">
            {/* Left Node: Seeking */}
            <div
              onClick={() => onQuickAction("SEEKING_SOLUTION")}
              className="group flex flex-col items-center text-center cursor-pointer transition hover:scale-105"
            >
              <div className="relative mb-2">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-indigo-500 bg-gradient-to-b from-indigo-100 to-indigo-200 flex items-center justify-center shadow-md shadow-indigo-100 overflow-hidden">
                  <div className="flex h-full w-full items-center justify-center bg-indigo-600/10 text-indigo-700">
                    <Target className="h-7 w-7" />
                  </div>
                </div>
                <div className="absolute -top-2.5 -right-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 border border-indigo-200 shadow-2xs whitespace-nowrap">
                  I need something...
                </div>
              </div>
              <span className="rounded-xl bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs group-hover:bg-indigo-700 transition">
                Seek Solutions
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">
                Companies · NGOs · Individuals
              </span>
            </div>

            {/* Infinity Connector with Handshake */}
            <div className="flex flex-col items-center px-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Handshake className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>

            {/* Right Node: Offering */}
            <div
              onClick={() => onQuickAction("OFFERING_SOLUTION")}
              className="group flex flex-col items-center text-center cursor-pointer transition hover:scale-105"
            >
              <div className="relative mb-2">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-emerald-500 bg-gradient-to-b from-emerald-100 to-emerald-200 flex items-center justify-center shadow-md shadow-emerald-100 overflow-hidden">
                  <div className="flex h-full w-full items-center justify-center bg-emerald-600/10 text-emerald-700">
                    <Rocket className="h-7 w-7" />
                  </div>
                </div>
                <div className="absolute -top-2.5 -left-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
                  I can offer something...
                </div>
              </div>
              <span className="rounded-xl bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs group-hover:bg-emerald-700 transition">
                Share Skills & Ideas
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">
                Developers · Startups · Investors
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Value Checklist */}
        <div className="lg:col-span-3 lg:border-l lg:border-indigo-100 lg:pl-6 space-y-2.5">
          {[
            "Find matched partners",
            "Collaborate securely",
            "Get paid for real work",
            "Grow together",
          ].map((text, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

