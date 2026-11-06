"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppSidebar, DashboardView, UserRole } from "@/components/dashboard/AppSidebar";
import { OpportunityHeroBanner } from "@/components/dashboard/OpportunityHeroBanner";
import { RecommendedOpportunitiesSection } from "@/components/dashboard/RecommendedOpportunitiesSection";
import { ActiveCollaborationsSection } from "@/components/dashboard/ActiveCollaborationsSection";
import { RecentActivitySection } from "@/components/dashboard/RecentActivitySection";
import { OpportunityDraftsList } from "@/components/OpportunityDraftsList";
import { OpportunityDiscoveryFeed } from "@/components/discovery/OpportunityDiscoveryFeed";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import { OpportunityStudioModal } from "@/components/OpportunityStudioModal";
import { CandidateRecommendationsModal } from "@/components/matching/CandidateRecommendationsModal";
import { ConnectionsProposalsView } from "@/components/connections/ConnectionsProposalsView";
import { ConnectionRequestModal } from "@/components/connections/ConnectionRequestModal";
import { DealRoomsListView } from "@/components/deal-rooms/DealRoomsListView";
import { DealRoomWorkspaceView } from "@/components/deal-rooms/DealRoomWorkspaceView";
import { BusinessOnboardingModal } from "@/components/BusinessOnboardingModal";
import { AuthModal } from "@/components/AuthModal";
import { DashboardStats } from "@/components/DashboardStats";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CommerceLedger } from "@/components/CommerceLedger";
import { CopilotChat } from "@/components/CopilotChat";
import {
  Business,
  DashboardOverview,
  CopilotRecommendation,
  Transaction,
  TransactionStatus,
  Opportunity,
  OpportunityStatus,
  OpportunityIntent,
  OpportunityCategory,
  User,
} from "@/types";
import {
  fetchDashboardOverview,
  fetchCopilotRecommendation,
  fetchLedgerTransactions,
  fetchUserOpportunities,
  fetchOpportunityById,
  getStoredUser,
  fetchCurrentUser,
  logoutUser,
  getAccessToken,
  clearAccessToken,
  createDealRoom,
  checkBackendHealth,
  ApiError,
} from "@/lib/api";
import {
  Bell,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  Menu,
  Rocket,
  Compass,
  Lightbulb,
} from "lucide-react";

function sanitizeErrorMessage(rawMessage?: string): string {
  if (!rawMessage) {
    return "We're having trouble connecting to your records right now. Please check your internet connection or try again.";
  }
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("credentials") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("not provided")
  ) {
    return "Sign in to view your personalized dashboard and track your opportunities.";
  }
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

const ROLE_STORAGE_KEY = "opnly_active_role";

function getInitialView(): DashboardView {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view") as DashboardView;
    const validViews: DashboardView[] = [
      "home",
      "opportunities",
      "browse",
      "collaborations",
      "deal-rooms",
      "ledger",
      "profile",
    ];
    if (viewParam && validViews.includes(viewParam)) {
      return viewParam === "browse" ? "opportunities" : viewParam;
    }
  }
  return "home";
}

function getInitialRole(): UserRole {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
    if (saved === "seeker" || saved === "creator") return saved;
  }
  return "seeker";
}

function getInitialOppTab(): "explore" | "mine" {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "mine" || tab === "explore") return tab;
    const v = params.get("view");
    if (v === "browse") return "explore";
    const role = localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === "creator") return "mine";
  }
  return "explore";
}

export default function Home() {
  const [currentView, setCurrentView] = useState<DashboardView>(getInitialView);
  const [activeRole, setActiveRole] = useState<UserRole>(getInitialRole);
  const [activeOppTab, setActiveOppTab] = useState<"explore" | "mine">(getInitialOppTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = useCallback(
    (view: DashboardView, tab?: "explore" | "mine") => {
      const targetView = view === "browse" ? "opportunities" : view;
      const targetTab = tab || (view === "browse" ? "explore" : undefined);

      setCurrentView(targetView);
      if (targetTab) {
        setActiveOppTab(targetTab);
      }

      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        if (targetView === "home") {
          searchParams.delete("view");
          searchParams.delete("tab");
        } else {
          searchParams.set("view", targetView);
          if (targetTab) {
            searchParams.set("tab", targetTab);
          } else {
            searchParams.delete("tab");
          }
        }
        const newQuery = searchParams.toString();
        const newUrl = newQuery ? `?${newQuery}` : window.location.pathname;
        window.history.pushState({ view: targetView, tab: targetTab }, "", newUrl);
      }
    },
    []
  );

  const handleOppTabChange = (tab: "explore" | "mine") => {
    setActiveOppTab(tab);
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("view", "opportunities");
      searchParams.set("tab", tab);
      window.history.pushState({ view: "opportunities", tab }, "", `?${searchParams.toString()}`);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setActiveRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = (params.get("view") as DashboardView) || "home";
      setCurrentView(v === "browse" ? "opportunities" : v);
      const t = params.get("tab") as "explore" | "mine" | null;
      if (t === "mine" || t === "explore") {
        setActiveOppTab(t);
      } else if (v === "browse") {
        setActiveOppTab("explore");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Business & Commerce Ledger state
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recommendation, setRecommendation] = useState<CopilotRecommendation | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opportunities state (Two-Sided Opportunity Network)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [oppError, setOppError] = useState<string | null>(null);
  const [selectedOppStatus, setSelectedOppStatus] = useState<OpportunityStatus | undefined>(undefined);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  const [studioInitialIntent, setStudioInitialIntent] = useState<OpportunityIntent | undefined>(undefined);
  const [studioInitialCategory, setStudioInitialCategory] = useState<OpportunityCategory | undefined>(undefined);

  // Modals & alerts
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [matchingOpportunity, setMatchingOpportunity] = useState<Opportunity | null>(null);
  const [connectTarget, setConnectTarget] = useState<{
    recipientUserId: string;
    recipientName?: string | null;
    opportunityId?: string | null;
    opportunityTitle?: string | null;
  } | null>(null);
  const [selectedDealRoomId, setSelectedDealRoomId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "offline">("checking");
  const [globalSearch, setGlobalSearch] = useState("");

  const handleOpenDealRoomFromProposal = async (proposalId: string) => {
    try {
      const room = await createDealRoom(proposalId);
      setSelectedDealRoomId(room.id);
      handleNavigate("deal-rooms");
    } catch (err) {
      console.error("Failed to open Deal Room from proposal", err);
      handleNavigate("deal-rooms");
    }
  };

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
    if (!getAccessToken()) {
      setOpportunities([]);
      setActiveOpportunity(null);
      setOppLoading(false);
      setOppError(null);
      return;
    }

    try {
      setOppLoading(true);
      setOppError(null);
      const res = await fetchUserOpportunities(statusFilter);
      setOpportunities(res.items);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      const lower = rawMsg.toLowerCase();
      if (
        lower.includes("expired") ||
        lower.includes("credentials") ||
        lower.includes("unauthorized") ||
        (err instanceof ApiError && err.status === 401)
      ) {
        clearAccessToken();
        setCurrentUser(null);
        setOpportunities([]);
        setActiveOpportunity(null);
        setOppError(null);
      } else {
        setOpportunities([]);
        setOppError(
          "We couldn't load your opportunity drafts right now. Please check your connection or try again."
        );
      }
    } finally {
      setOppLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === "ledger") {
      loadData(selectedStatus);
    }
  }, [currentView, loadData, selectedStatus]);

  useEffect(() => {
    loadOpportunities(selectedOppStatus);
  }, [loadOpportunities, selectedOppStatus]);

  useEffect(() => {
    const syncAuth = () => {
      const stored = getStoredUser();
      const token = getAccessToken();
      setCurrentUser(stored);
      if (!stored || !token) {
        setOpportunities([]);
        setActiveOpportunity(null);
        setOppError(null);
        setOppLoading(false);
      }
    };

    syncAuth();

    if (getAccessToken()) {
      fetchCurrentUser()
        .then((user) => {
          setCurrentUser(user);
        })
        .catch(() => {
          clearAccessToken();
          setCurrentUser(null);
          setOpportunities([]);
          setActiveOpportunity(null);
          setOppLoading(false);
        });
    } else {
      setOppLoading(false);
    }

    checkBackendHealth()
      .then((res) => {
        if (res && res.status === "healthy") {
          setBackendStatus("connected");
        } else {
          setBackendStatus("offline");
        }
      })
      .catch(() => setBackendStatus("offline"));

    const syncRole = () => {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
      if (saved === "seeker" || saved === "creator") {
        setActiveRole(saved);
      }
    };

    window.addEventListener("paypilot:auth_changed", syncAuth);
    window.addEventListener("opnly:role_changed", syncRole);
    return () => {
      window.removeEventListener("paypilot:auth_changed", syncAuth);
      window.removeEventListener("opnly:role_changed", syncRole);
    };
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    const saved = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
    if (saved === "seeker" || saved === "creator") {
      handleRoleChange(saved);
    }
    setSuccessToast(`Welcome, ${user.full_name || user.email}!`);
    if (currentView === "ledger") {
      loadData(selectedStatus);
    }
    loadOpportunities(selectedOppStatus);
  };

  const handleSignOut = () => {
    logoutUser();
    setCurrentUser(null);
    setOpportunities([]);
    setActiveOpportunity(null);
    setOppError(null);
    setSuccessToast("Signed out successfully.");
  };

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
    if (currentView === "ledger") {
      loadData(selectedStatus);
    }
  };

  const handleOpportunitySuccess = (savedOpp: Opportunity, message: string) => {
    setSuccessToast(message);
    setOpportunities((prev) => {
      const existingIdx = prev.findIndex((o) => o.id === savedOpp.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = savedOpp;
        return copy;
      }
      return [savedOpp, ...prev];
    });
    loadOpportunities(selectedOppStatus);
  };

  const handleOpenNewStudio = (intent?: OpportunityIntent, category?: OpportunityCategory) => {
    setActiveOpportunity(null);
    setStudioInitialIntent(intent || "SEEKING_SOLUTION");
    setStudioInitialCategory(category || "BUSINESS");
    setIsStudioOpen(true);
  };

  const handleOpenExistingStudio = async (opp: Opportunity) => {
    try {
      setOppError(null);
      const freshOpp = await fetchOpportunityById(opp.id);
      setActiveOpportunity(freshOpp);
      setStudioInitialIntent(freshOpp.intent);
      setStudioInitialCategory(freshOpp.category);
      setIsStudioOpen(true);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      const lower = rawMsg.toLowerCase();
      if (
        lower.includes("expired") ||
        lower.includes("credentials") ||
        lower.includes("unauthorized") ||
        (err instanceof ApiError && err.status === 401)
      ) {
        clearAccessToken();
        setCurrentUser(null);
        setOpportunities([]);
        setActiveOpportunity(null);
        setIsStudioOpen(false);
        setOppError(null);
      } else {
        // Fallback: if network glitch, open with cached opportunity
        setActiveOpportunity(opp);
        setStudioInitialIntent(opp.intent);
        setStudioInitialCategory(opp.category);
        setIsStudioOpen(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          business={overview?.business}
          activeRole={activeRole}
          onRoleChange={handleRoleChange}
          onOpenProfile={() => handleNavigate("profile")}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSignOut={handleSignOut}
          onCreateOpportunity={() => handleOpenNewStudio()}
        />
      </div>

      {/* Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/50 backdrop-blur-xs">
          <div className="w-64 bg-white h-full shadow-2xl flex flex-col">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AppSidebar
              currentView={currentView}
              onNavigate={(view) => {
                handleNavigate(view);
                setIsMobileSidebarOpen(false);
              }}
              currentUser={currentUser}
              business={overview?.business}
              activeRole={activeRole}
              onRoleChange={handleRoleChange}
              onOpenProfile={() => {
                setIsOnboardingOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenAuth={() => {
                setIsAuthOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onSignOut={() => {
                handleSignOut();
                setIsMobileSidebarOpen(false);
              }}
              onCreateOpportunity={() => {
                handleOpenNewStudio();
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Opnly</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-800 capitalize">
                {currentView === "home"
                  ? "Dashboard"
                  : currentView === "opportunities" || currentView === "browse"
                  ? activeOppTab === "explore"
                    ? "Opportunities / Explore Network"
                    : "Opportunities / My Workspace"
                  : currentView === "collaborations"
                  ? activeRole === "seeker"
                    ? "Applications & Proposals"
                    : "Review Proposals"
                  : currentView === "deal-rooms"
                  ? "AI Deal Rooms"
                  : currentView === "profile"
                  ? "Profile System"
                  : "Payments & Earnings"}
              </span>
              <span
                className={`ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                  activeRole === "seeker"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {activeRole === "seeker" ? "Seeker (Blue Mode)" : "Creator (Green Mode)"}
              </span>
            </div>
          </div>

          {/* Global Search Input (hidden on explore tab to eliminate duplicate stacked search bars) */}
          {!((currentView === "opportunities" || currentView === "browse") && activeOppTab === "explore") ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (globalSearch.trim()) {
                  handleNavigate("opportunities", "explore");
                }
              }}
              className="hidden md:flex flex-1 max-w-sm mx-4"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                  }}
                  placeholder="Search opportunities, skills, solutions..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
                />
              </div>
            </form>
          ) : (
            <div className="flex-1 max-w-sm mx-4 hidden md:block" />
          )}

          <div className="flex items-center gap-3">
            {/* Network Connectivity Status Badge */}
            <div className="hidden lg:flex items-center">
              {backendStatus === "connected" ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200"
                  title="Opportunity Network services connected"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Network Live</span>
                </span>
              ) : backendStatus === "offline" ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200"
                  title="Local services disconnected. Verify backend server is running."
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>Network Standby</span>
                </span>
              ) : null}
            </div>
            {overview?.business && currentView === "ledger" && (
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{overview.business.name}</span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-indigo-600">{overview.business.currency}</span>
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => handleNavigate("browse")}
              className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                2
              </span>
            </button>

            {/* Authentication Button */}
            {currentUser ? (
              <button
                onClick={handleSignOut}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                  activeRole === "seeker"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                }`}
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                  activeRole === "seeker"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                }`}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Page Main Content - Full Fluid Width without excessive margins */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 space-y-6 w-full">
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

          {/* Friendly notification if connection or auth has an issue */}
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
                  <p className="font-semibold text-amber-950">
                    {error.includes("Sign in") ? "Authentication Notice" : "Connection issue"}
                  </p>
                  <p className="text-amber-800/90 mt-0.5">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {error.includes("Sign in") && (
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
                <button
                  onClick={() => {
                    loadData(selectedStatus);
                    loadOpportunities(selectedOppStatus);
                  }}
                  className="inline-flex items-center justify-center space-x-1.5 rounded-xl bg-amber-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-900 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Try again</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW ROUTING */}
          {currentView === "home" ? (
            /* ========================================================================= */
            /* STREAMLINED ACTION-FIRST OPPORTUNITY HOME EXPERIENCE                      */
            /* ========================================================================= */
            <div className="space-y-6 w-full">
              {/* 1. Opportunity Hero Banner */}
              <section aria-label="Action-First Hero">
                <OpportunityHeroBanner
                  role={activeRole}
                  userName={currentUser?.full_name}
                  onNavigate={handleNavigate}
                  onRoleChange={handleRoleChange}
                  onQuickAction={(intent) => {
                    handleRoleChange(intent === "SEEKING_SOLUTION" ? "seeker" : "creator");
                    handleOpenNewStudio(intent);
                  }}
                  onCreateOpportunity={() => {
                    handleRoleChange("creator");
                    handleOpenNewStudio("OFFERING_SOLUTION");
                  }}
                />
              </section>

              {/* 2. Role-Tailored Core Section: Creator manages listings/drafts, Seeker explores recommendations */}
              {activeRole === "creator" ? (
                <section aria-label="Opportunity Drafts Workspace">
                  <OpportunityDraftsList
                    opportunities={opportunities}
                    isLoading={oppLoading}
                    error={oppError}
                    onRetry={() => loadOpportunities(selectedOppStatus)}
                    onSelectOpportunity={handleOpenExistingStudio}
                    onCreateNew={() => handleOpenNewStudio()}
                    selectedStatus={selectedOppStatus}
                    onFilterChange={handleOppFilterChange}
                    isAuthenticated={!!currentUser}
                    onSignIn={() => setIsAuthOpen(true)}
                    businesses={overview?.business ? [overview.business] : []}
                  />
                </section>
              ) : (
                <section aria-label="Recommended Opportunities">
                  <RecommendedOpportunitiesSection
                    currentUser={currentUser}
                    onSelectCategory={(category) =>
                      handleOpenNewStudio("SEEKING_SOLUTION", category)
                    }
                    onExploreAll={() => handleNavigate("browse")}
                    onViewOpportunity={(oppId) => {
                      const opp = opportunities.find((o) => o.id === oppId);
                      if (opp) handleOpenExistingStudio(opp);
                    }}
                  />
                </section>
              )}

              {/* 3. Balanced Activity & Collaborations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <section className="lg:col-span-7" aria-label="Recent Activity">
                  <RecentActivitySection
                    opportunities={opportunities}
                    onSelectOpportunity={handleOpenExistingStudio}
                    onSeeAll={() => handleNavigate(activeRole === "seeker" ? "browse" : "opportunities")}
                  />
                </section>

                <section className="lg:col-span-5" aria-label="Active Collaborations">
                  <ActiveCollaborationsSection
                    onSeeAll={() => handleNavigate("collaborations")}
                    onStartOpportunity={() => handleNavigate("browse")}
                  />
                </section>
              </div>
            </div>
          ) : currentView === "opportunities" || currentView === "browse" ? (
            /* ========================================================================= */
            /* UNIFIED OPPORTUNITY NETWORK & WORKSPACE HUB                               */
            /* ========================================================================= */
            <div className="space-y-6 w-full">
              {/* Hub Segmented Tab Header */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Compass className="h-4 w-4" />
                      </div>
                      <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                        Opportunity Network & Workspace
                      </h1>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                        {activeOppTab === "explore" ? "Network Feed" : "My Workspace"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeOppTab === "explore"
                        ? "Search and explore verified commercial opportunities and capabilities across the network."
                        : "Manage your captured ideas, structured drafts, and published commercial listings."}
                    </p>
                  </div>

                  {/* Segmented Tab Switcher */}
                  <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-2xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOppTabChange("explore")}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeOppTab === "explore"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      aria-pressed={activeOppTab === "explore"}
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Browse Opportunities</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOppTabChange("mine")}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeOppTab === "mine"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      aria-pressed={activeOppTab === "mine"}
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>My Opportunities</span>
                      {opportunities.length > 0 && (
                        <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-700">
                          {opportunities.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Tab View */}
              {activeOppTab === "explore" ? (
                <section aria-label="Browse Opportunity Network">
                  <OpportunityDiscoveryFeed
                    currentUser={currentUser}
                    initialIntent={studioInitialIntent}
                    initialCategory={studioInitialCategory}
                    initialQuery={globalSearch}
                    onOpenInStudio={(opp) =>
                      handleOpenExistingStudio(opp as unknown as Opportunity)
                    }
                    onCreateOpportunity={(intent, category) =>
                      handleOpenNewStudio(intent, category)
                    }
                  />
                </section>
              ) : (
                <section aria-label="Opportunity Drafts Workspace">
                  <OpportunityDraftsList
                    opportunities={opportunities}
                    isLoading={oppLoading}
                    error={oppError}
                    onRetry={() => loadOpportunities(selectedOppStatus)}
                    onSelectOpportunity={handleOpenExistingStudio}
                    onCreateNew={() => handleOpenNewStudio()}
                    selectedStatus={selectedOppStatus}
                    onFilterChange={handleOppFilterChange}
                    isAuthenticated={!!currentUser}
                    onSignIn={() => setIsAuthOpen(true)}
                  />
                </section>
              )}
            </div>
          ) : currentView === "collaborations" ? (
            /* ========================================================================= */
            /* CONNECTIONS & PROPOSALS COLLABORATION VIEW                                */
            /* ========================================================================= */
            <div className="space-y-6">
              <ConnectionsProposalsView
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenDealRoom={handleOpenDealRoomFromProposal}
              />
            </div>
          ) : currentView === "deal-rooms" ? (
            /* ========================================================================= */
            /* AI DEAL ROOMS COLLABORATION WORKSPACES                                    */
            /* ========================================================================= */
            <div className="space-y-6">
              {selectedDealRoomId ? (
                <DealRoomWorkspaceView
                  roomId={selectedDealRoomId}
                  currentUser={currentUser}
                  onBackToList={() => setSelectedDealRoomId(null)}
                />
              ) : (
                <DealRoomsListView
                  currentUser={currentUser}
                  onSelectRoom={(roomId) => setSelectedDealRoomId(roomId)}
                  onOpenBrowse={() => handleNavigate("browse")}
                />
              )}
            </div>
          ) : currentView === "profile" ? (
            /* ========================================================================= */
            /* PROFILE SYSTEM (INDIVIDUAL + ORGANIZATION)                                */
            /* ========================================================================= */
            <div className="space-y-6">
              <ProfileWorkspace
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            </div>
          ) : (
            /* ========================================================================= */
            /* PAYMENTS & EARNINGS WORKSPACE (COMMERCE LEDGER & FINANCIAL TOOLS)          */
            /* ========================================================================= */
            <div className="space-y-6">
              <section aria-label="Business Metrics">
                <DashboardStats totals={overview?.totals} loading={loading} />
              </section>

              <section aria-label="Copilot Recommendation">
                <RecommendationCard
                  recommendation={recommendation}
                  loading={loading}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              </section>

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

              {/* Contextual simulated operations disclaimer */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-medium text-slate-700">
                  Payments &amp; Earnings Ledger — Grounded in verified milestone contracts and simulated PayPal rails.
                </span>
                <span className="text-[11px] text-slate-400">
                  Simulated payment operations. No live PayPal accounts or real funds are used.
                </span>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 Opnly — Two-Sided Idea-to-Business Opportunity Network.</p>
            <p className="text-[11px] text-slate-400">
              Connecting ideas, capabilities, and verified commercial outcomes.
            </p>
          </div>
        </footer>
      </div>

      {/* Modals */}
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
        onFindCollaborators={(opp) => setMatchingOpportunity(opp)}
        initialIntent={studioInitialIntent}
        initialCategory={studioInitialCategory}
      />

      <CandidateRecommendationsModal
        isOpen={Boolean(matchingOpportunity)}
        opportunityId={matchingOpportunity?.id ?? null}
        opportunityTitle={matchingOpportunity?.title}
        onClose={() => setMatchingOpportunity(null)}
        onConnectCandidate={(candidate) => {
          setConnectTarget({
            recipientUserId: String(candidate.id),
            recipientName: candidate.name,
            opportunityId: matchingOpportunity?.id || null,
            opportunityTitle: matchingOpportunity?.title,
          });
        }}
      />

      {connectTarget && (
        <ConnectionRequestModal
          isOpen={true}
          onClose={() => setConnectTarget(null)}
          recipientUserId={connectTarget.recipientUserId}
          recipientName={connectTarget.recipientName}
          opportunityId={connectTarget.opportunityId}
          opportunityTitle={connectTarget.opportunityTitle}
          onSuccess={() => {
            setConnectTarget(null);
            setSuccessToast("Connection request sent successfully!");
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
