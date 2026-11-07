"use client";

import React from "react";
import {
  Sparkles,
  ArrowRight,
  Compass,
  PlusCircle,
  Briefcase,
  LogIn,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Search,
  MessageSquare,
  DollarSign,
  Clock,
  Layers,
  ArrowUpRight,
  Lightbulb,
  Building2,
  Users,
} from "lucide-react";
import { OpportunityIntent } from "@/types";

interface PublicLandingViewProps {
  onOpenAuth: () => void;
  onExploreOpportunities: () => void;
  onPostRequest: () => void;
  onOfferSkills: () => void;
  onNavigateView?: (view: "opportunities" | "deal-rooms" | "ledger") => void;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  onOpenAuth,
  onExploreOpportunities,
  onPostRequest,
  onOfferSkills,
  onNavigateView,
}) => {
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* ========================================================================= */}
      {/* 00 · PUBLIC HEADER                                                        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Opnly
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">
                Idea-to-Business Opportunity Network
              </span>
            </div>
          </div>

          {/* Quick Nav Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#two-paths" className="hover:text-slate-900 transition">
              Participation Paths
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition">
              How It Works
            </a>
            <a href="#examples" className="hover:text-slate-900 transition">
              Example Opportunities
            </a>
            <a href="#trust-reliability" className="hover:text-slate-900 transition">
              Trust & Reliability
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExploreOpportunities}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-indigo-600" />
              <span>Explore Opportunities</span>
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-16 sm:space-y-24 py-8 sm:py-14">
        {/* ========================================================================= */}
        {/* 01 · HERO SECTION                                                         */}
        {/* ========================================================================= */}
        <section
          aria-label="Hero Section"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6"
        >
          {/* Hero Tagline Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/90 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Commercial Opportunity Network</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight sm:leading-none">
            Ideas need people.{" "}
            <span className="block sm:inline bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600">
              Skills need opportunities.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            One platform to connect both sides. Structure requirements, match with
            complementary partners, collaborate in private Deal Rooms, and complete milestones
            with transparent payment workflows.
          </p>

          {/* Direct CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onExploreOpportunities}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Opportunities</span>
            </button>
            <button
              type="button"
              onClick={onPostRequest}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-indigo-600" />
              <span>Post a Request</span>
            </button>
            <button
              type="button"
              onClick={onOfferSkills}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-xs transition cursor-pointer"
            >
              <Briefcase className="h-4 w-4 text-emerald-600" />
              <span>Offer Your Skills</span>
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          </div>

          {/* Trust Highlights Strip */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                Dual-Party Agreements
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                Milestone Tracking
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                Explainable Matching
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <DollarSign className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                Verified Payment Records
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 02 · TWO PARTICIPATION PATHS                                              */}
        {/* ========================================================================= */}
        <section
          id="two-paths"
          aria-label="Two Participation Paths"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Participation Paths
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              I need a solution ↔ I have skills to offer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Whether you are solving a business challenge or applying specialized talent,
              Opnly supports your commercial objectives.
            </p>
          </div>

          {/* Side-by-side Dual Path Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Path 1: I need a solution */}
            <div className="flex flex-col justify-between rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-6 sm:p-8 shadow-xs">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-800">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>I Need a Solution</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Turn problems into structured deliverables
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Post business bottlenecks, product ideas, or resource needs. The AI Business
                  Analyst structures deliverables, assumptions, and required skills so you can
                  evaluate candidates on clear criteria.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Structure scope, deliverables, and acceptance criteria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Receive mutual recommendations with transparent rationale</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Invite candidates to negotiate terms in a private Deal Room</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-blue-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onPostRequest}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <span>Post a Request</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-semibold text-slate-500">
                  For founders, SMBs & leaders
                </span>
              </div>
            </div>

            {/* Path 2: I have skills to offer */}
            <div className="flex flex-col justify-between rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-6 sm:p-8 shadow-xs">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/90 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>I Have Skills to Offer</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Commercialize proven technical & domain capabilities
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Offer development, architecture, design, or specialized domain expertise.
                  Discover initiatives that match your exact strengths and submit milestone
                  proposals with agreed payment terms.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Publish capability profiles with verifiable skill evidence</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Propose structured milestones and transparent pricing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Link deliverable approvals to transparent payment workflows</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-emerald-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onOfferSkills}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <span>Offer Your Skills</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-semibold text-slate-500">
                  For engineers, creators & experts
                </span>
              </div>
            </div>
          </div>

          {/* Fluid Dual-Participation Clarification Box */}
          <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/70 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-700" />
                <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                  One account. Participate both ways.
                </h4>
              </div>
              <p className="text-xs text-indigo-900/80 leading-relaxed max-w-3xl">
                You do not choose a permanent role. A founder seeking an engineering lead for an
                AI initiative can also offer operational advisory on other projects. Workspaces
                are streamlined views for your active initiatives, not separate account silos.
              </p>
            </div>
            <button
              type="button"
              onClick={onExploreOpportunities}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-100/60 transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <span>Explore the Network</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 03 · HOW THE NETWORK WORKS (SINGLE VISUAL JOURNEY)                       */}
        {/* ========================================================================= */}
        <section
          id="how-it-works"
          aria-label="How the Network Works"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              The Opportunity Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              How the network works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              A single visual journey from structured idea to verified milestone completion.
            </p>
          </div>

          {/* Single Horizontal Progression Journey */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Step 1: Publish */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-indigo-600">01 · Publish</span>
                <h3 className="text-xs font-bold text-slate-900">Capture & Structure</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Post a need or offer. AI extracts structured deliverables, assumptions, and
                  technical requirements.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <span>Structured Model</span>
              </div>
            </div>

            {/* Step 2: Match */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-indigo-600">02 · Match</span>
                <h3 className="text-xs font-bold text-slate-900">Mutual Recommendations</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Engine pairs compatible parties based on verified capabilities and explained
                  rationale.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <span>Explainable Fit</span>
              </div>
            </div>

            {/* Step 3: Invite */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-indigo-600">03 · Invite</span>
                <h3 className="text-xs font-bold text-slate-900">Private Deal Room</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Open a dedicated collaboration space to negotiate scope, timeline, and
                  commercial proposals.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <span>Confidential Workspace</span>
              </div>
            </div>

            {/* Step 4: Agree */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-indigo-600">04 · Agree</span>
                <h3 className="text-xs font-bold text-slate-900">Mutual Terms</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Lock in milestone criteria, acceptance tests, and agreed milestone amounts with
                  dual approval.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <span>Dual-Party Sign-Off</span>
              </div>
            </div>

            {/* Step 5: Collaborate */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-indigo-600">05 · Collaborate</span>
                <h3 className="text-xs font-bold text-slate-900">Execute & Evidence</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Submit milestone deliverables with verifiable evidence and complete inspection
                  audits.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <span>Verifiable Deliverables</span>
              </div>
            </div>

            {/* Step 6: Get Paid */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-300 transition bg-emerald-50/30">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-emerald-700">06 · Get Paid</span>
                <h3 className="text-xs font-bold text-slate-900">Verified Payouts</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Milestone approval linked to the agreed payment process and verified transaction
                  records.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <span>PayPal Verified</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 04 · OPPORTUNITIES HAPPENING HERE (EXAMPLE OPPORTUNITIES)                  */}
        {/* ========================================================================= */}
        <section
          id="examples"
          aria-label="Example Opportunities"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Network Discovery
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
                Opportunities happening here
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Discover what people need and what others can contribute.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200 self-start sm:self-auto">
              <span>Example Opportunities</span>
            </div>
          </div>

          {/* 2 Clearly Labelled Example Opportunity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Example 1: Problem / Need */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-indigo-300 transition space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                  <PlusCircle className="h-3 w-3" />
                  <span>Seeking Solution</span>
                </span>
                <span className="text-xs font-bold text-indigo-600">Fintech · USD $4,500</span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Automated Financial Reconciliation Engine
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Seeking an engineer to build deterministic reconciliation rules matching bank
                  statements with operational commerce events.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Milestone Deliverables (3)
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium">
                    1. CSV/API Ingestion Pipeline
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium">
                    2. Discrepancy Matching Algorithm
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium">
                    3. Dual-Approval Ledger Sync
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 italic">
                  Example commercial problem
                </span>
                <button
                  type="button"
                  onClick={onExploreOpportunities}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <span>Explore Network</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Example 2: Offering / Skill */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-300 transition space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <Briefcase className="h-3 w-3" />
                  <span>Offering Solution</span>
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  Cloud Architecture · USD $6,000
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  High-Throughput Distributed Microservices Architecture
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Offering proven architectural design, containerized deployment, and high-volume
                  transaction processing capabilities for scaling platforms.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Milestone Deliverables (3)
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium">
                    1. System Architecture Specification
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium">
                    2. Infrastructure as Code Template
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium">
                    3. Load Test & Latency Verification
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 italic">
                  Example capability offering
                </span>
                <button
                  type="button"
                  onClick={onExploreOpportunities}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
                >
                  <span>Explore Network</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onExploreOpportunities}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <Compass className="h-4 w-4 text-indigo-600" />
              <span>Browse All Open Opportunities</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 05 · TRUST AND RELIABILITY                                                */}
        {/* ========================================================================= */}
        <section
          id="trust-reliability"
          aria-label="Trust and Reliability"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Commercial Confidence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Work with greater confidence
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Agreements, evidence, payment verification, and reliability indicators designed to
              protect both sides.
            </p>
          </div>

          {/* 4 Trust Pillars with Specific Verification Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Mutual Agreements</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deliverables, acceptance criteria, deadlines, and pricing are locked by mutual
                  dual-party approval before work begins.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Dual-Party Confirmed</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Evidence Reviews</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Milestone completions require deliverable proof (code, documents, assets)
                  verified directly by the initiative creator.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] font-semibold text-indigo-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Auditable Proof</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Payment Verification</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Verified payment records and transparent payment workflows backed by official
                  PayPal transaction references and receipts.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>PayPal Processed</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Reduce Payment Delays</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Reduce payment delays through agreed terms, reminders, and milestone tracking.
                  No chasing invoices after work is done.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] font-semibold text-purple-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Milestone-Driven</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 06 · FINAL CTA & PUBLIC FOOTER                                            */}
        {/* ========================================================================= */}
        <section
          aria-label="Final Call to Action"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-center text-white shadow-xl space-y-6">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
              Your next opportunity starts here.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Join founders, developers, creators, and businesses turning real problems into
              verified commercial outcomes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onExploreOpportunities}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                <span>Explore Opportunities</span>
              </button>
              <button
                type="button"
                onClick={onPostRequest}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/20 transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 text-blue-400" />
                <span>Post a Request</span>
              </button>
              <button
                type="button"
                onClick={onOfferSkills}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/20 transition cursor-pointer"
              >
                <Briefcase className="h-4 w-4 text-emerald-400" />
                <span>Offer Your Skills</span>
              </button>
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Opnly</p>
              <p className="text-xs text-slate-500">
                The Idea-to-Business Opportunity Network
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={onExploreOpportunities}
              className="hover:text-indigo-600 transition cursor-pointer"
            >
              Explore Opportunities
            </button>
            <button
              type="button"
              onClick={() => onNavigateView?.("deal-rooms")}
              className="hover:text-indigo-600 transition cursor-pointer"
            >
              Deal Rooms
            </button>
            <button
              type="button"
              onClick={() => onNavigateView?.("ledger")}
              className="hover:text-indigo-600 transition cursor-pointer"
            >
              Payments & Earnings
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="hover:text-indigo-600 transition cursor-pointer"
            >
              Sign In
            </button>
          </div>

          <p className="text-xs text-slate-400">
            &copy; 2026 Opnly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

