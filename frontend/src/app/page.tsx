"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { DashboardStats } from "@/components/DashboardStats";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CommerceLedger } from "@/components/CommerceLedger";
import { CopilotChat } from "@/components/CopilotChat";
import {
  DashboardOverview,
  CopilotRecommendation,
  Transaction,
  TransactionStatus,
} from "@/types";
import {
  fetchDashboardOverview,
  fetchCopilotRecommendation,
  fetchLedgerTransactions,
} from "@/lib/api";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function Home() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recommendation, setRecommendation] = useState<CopilotRecommendation | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || "Failed to connect to PayPilot backend APIs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedStatus);
  }, [loadData, selectedStatus]);

  const handleFilterChange = (newStatus?: TransactionStatus) => {
    setSelectedStatus(newStatus);
  };

  const handlePaymentSuccess = (captured: Transaction) => {
    // Reload data to reflect captured payment and refreshed dashboard totals
    loadData(selectedStatus);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header business={overview?.business} />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Error notice if backend is down */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData(selectedStatus)}
              className="flex items-center space-x-1 font-semibold text-red-800 hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

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
              selectedStatus={selectedStatus}
              onFilterChange={handleFilterChange}
            />
          </section>

          <section aria-label="Copilot Assistant">
            <CopilotChat />
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 PayPilot AI — Decision-to-Payment Demonstration.</p>
          <p className="text-[11px] text-slate-400">
            Simulated payment operations. No live PayPal accounts or real funds are used.
          </p>
        </div>
      </footer>
    </div>
  );
}

