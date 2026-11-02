import React from "react";
import { DollarSign, CheckCircle2, Clock, FileText } from "lucide-react";
import { DashboardTotals } from "@/types";

interface DashboardStatsProps {
  totals?: DashboardTotals | null;
  loading?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ totals, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-24 bg-slate-200 rounded mb-3"></div>
            <div className="h-8 w-32 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (val?: string) => {
    const num = parseFloat(val || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: totals?.currency || "USD",
    }).format(num);
  };

  const cards = [
    {
      title: "Settled Revenue",
      value: formatCurrency(totals?.total_revenue),
      subtext: "Verified captured funds",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
    },
    {
      title: "Completed Orders",
      value: totals?.completed_count?.toString() || "0",
      subtext: "Captured transactions",
      icon: CheckCircle2,
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
    },
    {
      title: "Pending Balance",
      value: formatCurrency(totals?.pending_total),
      subtext: `${totals?.pending_count || 0} order awaiting review`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-100",
    },
    {
      title: "Total Transactions",
      value: totals?.transaction_count?.toString() || "0",
      subtext: "Commerce ledger entries",
      icon: FileText,
      color: "text-slate-600",
      bg: "bg-slate-50 border-slate-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {card.title}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {card.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{card.subtext}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${card.bg}`}>
              <Icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

