"use client";

import React from "react";
import { Handshake, ArrowRight } from "lucide-react";

interface NetworkImpactBannerProps {
  onExplore: () => void;
}

export const NetworkImpactBanner: React.FC<NetworkImpactBannerProps> = ({ onExplore }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-xs border border-white/10">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Real Opportunities. Real Impact.
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Join a growing network of innovators, investors and changemakers.
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition cursor-pointer"
          >
            <span>Explore the Network</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Decorative gradient accents */}
      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="absolute right-12 top-0 h-24 w-24 rounded-full bg-violet-500/15 blur-xl" />
    </div>
  );
};

