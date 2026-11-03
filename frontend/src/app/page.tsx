"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { DashboardStats } from "@/components/DashboardStats";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CommerceLedger } from "@/components/CommerceLedger";
import { CopilotChat } from "@/components/CopilotChat";
import { BusinessOnboardingModal } from "@/components/BusinessOnboardingModal";
import { OpportunityStudioModal } from "@/components/OpportunityStudioModal";
import { OpportunityDraftsList } from "@/components/OpportunityDraftsList";
import {
  Business,
  DashboardOverview,
  CopilotRecommendation,
  Transaction,
  TransactionStatus,
  Opportunity,
  OpportunityStatus,
} from "@/types";
import {
  fetchDashboardOverview,
  fetchCopilotRecommendation,
  fetchLedgerTransactions,
  fetchUserOpportunities,
} from "@/lib/api";
import { RefreshCw, AlertCircle, CheckCircle2, X } from "lucide-react";

function sanitizeErrorMessage(rawMessage?: string): string {
  if (!rawMessage) {
    return "We're having trouble connecting to your financial records right now. Please check your internet connection or try again.";
  }
  const lower = rawMessage.toLowerCase();
  const containsTechnicalTerms =
    lower.includes("backend") ||
    lower.includes("http") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("service") ||
    lower.includes("status") ||
    lower.includes("500") ||
    lower.includes("404") ||
    lower.includes("api") ||
    lower.includes("exception") ||
    lower.includes("traceback") ||
    lower.includes("sql") ||
    lower.includes("undefinedtable");

  if (containsTechnicalTerms) {
    return "We're having trouble connecting to your financial records right now. Please check your internet connection or try again.";
  }

  return rawMessage;
}

export default function Home() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recommendation, setRecommendation] = useState<CopilotRecommendation | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Opportunities state (Stage 1 & 2)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [selectedOppStatus, setSelectedOppStatus] = useState<OpportunityStatus | undefined>(undefined);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);

  // Modals & alerts
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = useCallback(async (statusFilter?: TransactionStatus) => {
    try {
      setLoading(true);
      setError(null);

      const [ovData, recData, ledgerData] = await Promise.all([
        fetchDashboardOverview(),
        fetchCopilotRecommendation(),
        fetchLedgerTransactions(statusFilter),
      ]);

      setOverview(ovData);
      setRecommendation(recData);
      setTransactions(ledgerData.items);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      setError(sanitizeErrorMessage(rawMsg));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOpportunities = useCallback(async (statusFilter?: OpportunityStatus) => {
    try {
      setOppLoading(true);
      const res = await fetchUserOpportunities(statusFilter);
      setOpportunities(res.items);
    } catch {
      // Graceful fallback for offline/disconnected states
      setOpportunities([]);
    } finally {
      setOppLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedStatus);
  }, [loadData, selectedStatus]);

  useEffect(() => {
    loadOpportunities(selectedOppStatus);
  }, [loadOpportunities, selectedOppStatus]);

  const handleFilterChange = (newStatus?: TransactionStatus) => {
    setSelectedStatus(newStatus);
  };

  const handleOppFilterChange = (newStatus?: OpportunityStatus) => {
    setSelectedOppStatus(newStatus);
  };

  const handlePaymentSuccess = () => {
    loadData(selectedStatus);
  };

  const handleProfileCreated = (newBiz: Business) => {
    setSuccessToast(`Business profile for "${newBiz.name}" saved successfully.`);
    loadData(selectedStatus);
  };

  const handleOpportunitySuccess = (savedOpp: Opportunity, message: string) => {
    setSuccessToast(message);
    loadOpportunities(selectedOppStatus);
  };

  const handleOpenNewStudio = () => {
    setActiveOpportunity(null);
    setIsStudioOpen(true);
  };

  const handleOpenExistingStudio = (opp: Opportunity) => {
    setActiveOpportunity(opp);
    setIsStudioOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        business={overview?.business}
        onCreateProfile={() => setIsOnboardingOpen(true)}
        onCreateOpportunity={handleOpenNewStudio}
      />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Success toast after saving */}
        {successToast && (
          <div
            role="status"
            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-900 shadow-xs"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="font-semibold">{successToast}</p>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900 transition"
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Friendly notification if connection has an issue */}
        {error && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-950">Connection issue</p>
                <p className="text-amber-800/90 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => {
                loadData(selectedStatus);
                loadOpportunities(selectedOppStatus);
              }}
              className="inline-flex items-center justify-center space-x-1.5 rounded-xl bg-amber-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-900 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* Stage 1 & 2 Opportunity Workspace */}
        <section aria-label="Opportunity Workspace">
          <OpportunityDraftsList
            opportunities={opportunities}
            isLoading={oppLoading}
            onSelectOpportunity={handleOpenExistingStudio}
            onCreateNew={handleOpenNewStudio}
            selectedStatus={selectedOppStatus}
            onFilterChange={handleOppFilterChange}
          />
        </section>

        {/* Top: 4 Dashboard Overview Cards */}
        <section aria-label="Business Metrics">
          <DashboardStats totals={overview?.totals} loading={loading} />
        </section>

        {/* Middle: Decision-to-Payment AI Recommendation */}
        <section aria-label="Copilot Recommendation">
          <RecommendationCard
            recommendation={recommendation}
            loading={loading}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </section>

        {/* Bottom Split: Commerce Ledger + Copilot Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2" aria-label="Commerce Ledger">
            <CommerceLedger
              transactions={transactions}
              loading={loading}
              error={error}
              selectedStatus={selectedStatus}
              onFilterChange={handleFilterChange}
            />
          </section>

          <section aria-label="Copilot Assistant">
            <CopilotChat />
          </section>
        </div>
      </main>

      <BusinessOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={handleProfileCreated}
      />

      <OpportunityStudioModal
        isOpen={isStudioOpen}
        onClose={() => {
          setIsStudioOpen(false);
          setActiveOpportunity(null);
        }}
        onSuccess={handleOpportunitySuccess}
        existingOpportunity={activeOpportunity}
        businessId={overview?.business?.id}
      />

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 PayPilot AI — Idea-to-Business Opportunity Network.</p>
          <p className="text-[11px] text-slate-400">
            Simulated payment operations. No live PayPal accounts or real funds are used.
          </p>
        </div>
      </footer>
    </div>
  );
}
