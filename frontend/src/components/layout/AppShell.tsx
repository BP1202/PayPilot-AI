"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppSidebar, DashboardView } from "@/components/dashboard/AppSidebar";
import { OpportunityDraftsList } from "@/components/OpportunityDraftsList";
import { OpportunityDiscoveryFeed } from "@/components/discovery/OpportunityDiscoveryFeed";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import { OpportunityStudioModal } from "@/components/OpportunityStudioModal";
import { CandidateRecommendationsModal } from "@/components/matching/CandidateRecommendationsModal";
import { ConnectionsProposalsView } from "@/components/connections/ConnectionsProposalsView";
import { ConnectionRequestModal } from "@/components/connections/ConnectionRequestModal";
import { DealRoomsListView } from "@/components/deal-rooms/DealRoomsListView";
import { DealRoomWorkspaceView } from "@/components/deal-rooms/DealRoomWorkspaceView";
import { AuthModal } from "@/components/AuthModal";
import { PublicLandingView } from "@/components/landing/PublicLandingView";
import { UnifiedWorkspaceView } from "@/components/dashboard/UnifiedWorkspaceView";
import { DashboardStats } from "@/components/DashboardStats";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CommerceLedger } from "@/components/CommerceLedger";
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
  ApiError,
} from "@/lib/api";
import {
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
  User as UserIcon,
  ChevronDown,
  LogOut,
  Receipt,
  Briefcase,
  ShieldCheck,
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

function getInitialViewFromPath(defaultView: DashboardView = "home"): DashboardView {
  return defaultView;
}

function getInitialOppTab(defaultTab: "explore" | "mine" = "explore"): "explore" | "mine" {
  return defaultTab;
}

export interface AppShellProps {
  initialView?: DashboardView;
  initialOppTab?: "explore" | "mine";
}

export const AppShell: React.FC<AppShellProps> = ({
  initialView = "home",
  initialOppTab,
}) => {
  const [currentView, setCurrentView] = useState<DashboardView>(() =>
    getInitialViewFromPath(initialView)
  );
  const [activeOppTab, setActiveOppTab] = useState<"explore" | "mine">(() =>
    initialOppTab || getInitialOppTab()
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<{
    intent: OpportunityIntent;
    category?: OpportunityCategory;
  } | null>(null);
  const [matchingOpportunity, setMatchingOpportunity] = useState<Opportunity | null>(null);
  const [connectTarget, setConnectTarget] = useState<{
    recipientUserId: string;
    recipientName?: string | null;
    opportunityId?: string | null;
    opportunityTitle?: string | null;
  } | null>(null);
  const [selectedDealRoomId, setSelectedDealRoomId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Dynamic Browser URL Route Synchronization
  const handleNavigate = useCallback(
    (view: DashboardView, tab?: "explore" | "mine") => {
      const targetTab = view === "opportunities" ? tab || "explore" : undefined;
      setCurrentView(view);
      if (view === "opportunities") {
        setActiveOppTab(targetTab || "explore");
      }

      if (typeof window !== "undefined") {
        let routePath = "/";
        if (view === "opportunities") {
          routePath = targetTab ? `/opportunities?tab=${targetTab}` : "/opportunities";
        } else if (view === "collaborations") {
          routePath = "/collaborations";
        } else if (view === "deal-rooms") {
          routePath = "/deal-rooms";
        } else if (view === "profile") {
          routePath = "/profile";
        } else if (view === "ledger") {
          routePath = "/ledger";
        }

        window.history.pushState({ view, tab: targetTab }, "", routePath);
      }
    },
    []
  );

  const handleOppTabChange = (tab: "explore" | "mine") => {
    setActiveOppTab(tab);
    if (typeof window !== "undefined") {
      window.history.pushState(
        { view: "opportunities", tab },
        "",
        `/opportunities?tab=${tab}`
      );
    }
  };

  // Browser Back & Forward URL Synchronization + Client Mount Sync
  useEffect(() => {
    // Initial mount sync from URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rId = params.get("room_id");
      if (rId) {
        setSelectedDealRoomId(rId);
      }
      const t = params.get("tab") as "explore" | "mine" | null;
      if (t === "mine" || t === "explore") {
        setActiveOppTab(t);
      }
      const viewParam = params.get("view") as DashboardView | null;
      if (
        viewParam &&
        ["home", "opportunities", "collaborations", "deal-rooms", "ledger", "profile"].includes(viewParam)
      ) {
        setCurrentView(viewParam);
      }
    }

    const handlePopState = () => {
      const pathView = getInitialViewFromPath("home");
      setCurrentView(pathView);
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab") as "explore" | "mine" | null;
      if (t === "mine" || t === "explore") {
        setActiveOppTab(t);
      } else if (pathView === "opportunities") {
        setActiveOppTab("explore");
      }
      const rId = params.get("room_id");
      if (rId) {
        setSelectedDealRoomId(rId);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenDealRoomFromProposal = async (proposalId: string) => {
    try {
      const room = await createDealRoom(proposalId);
      setSelectedDealRoomId(room.id);
      handleNavigate("deal-rooms");
    } catch (err) {
      console.error("Failed to open Deal Room from proposal", err);
      // Fallback: set the ID anyway as the backend now also resolves by proposal_id
      setSelectedDealRoomId(proposalId);
      handleNavigate("deal-rooms");
    }
  };

  useEffect(() => {
    if (selectedDealRoomId && selectedDealRoomId.startsWith("prop_")) {
      createDealRoom(selectedDealRoomId)
        .then((room) => {
          setSelectedDealRoomId(room.id);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.get("room_id") === selectedDealRoomId) {
              url.searchParams.set("room_id", room.id);
              window.history.replaceState({}, "", url.toString());
            }
          }
        })
        .catch((err) => {
          console.warn("Could not pre-resolve proposal to deal room", err);
        });
    }
  }, [selectedDealRoomId]);

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

    window.addEventListener("paypilot:auth_changed", syncAuth);
    return () => {
      window.removeEventListener("paypilot:auth_changed", syncAuth);
    };
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setSuccessToast(`Welcome, ${user.full_name || user.email}!`);
    if (currentView === "ledger") {
      loadData(selectedStatus);
    }
    loadOpportunities(selectedOppStatus);

    if (pendingActionAfterAuth) {
      const { intent, category } = pendingActionAfterAuth;
      setPendingActionAfterAuth(null);
      handleOpenNewStudio(intent, category);
    }
  };

  const handlePublicPostRequest = () => {
    if (!currentUser) {
      setPendingActionAfterAuth({ intent: "SEEKING_SOLUTION" });
      setIsAuthOpen(true);
    } else {
      handleOpenNewStudio("SEEKING_SOLUTION");
    }
  };

  const handlePublicOfferSkills = () => {
    if (!currentUser) {
      setPendingActionAfterAuth({ intent: "OFFERING_SOLUTION" });
      setIsAuthOpen(true);
    } else {
      handleOpenNewStudio("OFFERING_SOLUTION");
    }
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
        setActiveOpportunity(opp);
        setStudioInitialIntent(opp.intent);
        setStudioInitialCategory(opp.category);
        setIsStudioOpen(true);
      }
    }
  };

  const isPublicHome = currentView === "home" && !currentUser;

  if (isPublicHome) {
    return (
      <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-y-auto">
        <PublicLandingView
          onOpenAuth={() => setIsAuthOpen(true)}
          onExploreOpportunities={() => handleNavigate("opportunities", "explore")}
          onPostRequest={handlePublicPostRequest}
          onOfferSkills={handlePublicOfferSkills}
          onNavigateView={(view) => handleNavigate(view)}
        />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />

        <OpportunityStudioModal
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          onSuccess={handleOpportunitySuccess}
          existingOpportunity={activeOpportunity}
          businessId={overview?.business?.id}
          onFindCollaborators={(opp) => setMatchingOpportunity(opp)}
          initialIntent={studioInitialIntent}
          initialCategory={studioInitialCategory}
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
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar: stays full viewport height, never cut off on scroll */}
      <div className="hidden md:flex md:w-64 md:h-screen md:sticky md:top-0 md:shrink-0 flex-col">
        <AppSidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenProfile={() => {
            handleNavigate("profile");
          }}
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
              onOpenProfile={() => {
                handleNavigate("profile");
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

      {/* Main Content Area: independently scrollable full viewport height */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
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
                  : currentView === "opportunities"
                  ? activeOppTab === "explore"
                    ? "Opportunities / Explore Network"
                    : "Opportunities / My Opportunities"
                  : currentView === "collaborations"
                  ? "Connections & Proposals"
                  : currentView === "deal-rooms"
                  ? "Deal Rooms"
                  : currentView === "profile"
                  ? "Profile & Capabilities"
                  : "Payments & Ledger"}
              </span>
            </div>
          </div>

          {/* Global Search Input */}
          {!(currentView === "opportunities" && activeOppTab === "explore") ? (
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
            {overview?.business && currentView === "ledger" && (
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{overview.business.name}</span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-indigo-600">{overview.business.currency}</span>
              </div>
            )}

            {/* Top Right Profile Icon & Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-1.5 pr-2.5 text-indigo-900 transition hover:bg-indigo-100/70 cursor-pointer"
                  aria-label="User profile menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-[11px] font-extrabold text-white shadow-2xs ring-2 ring-indigo-200"
                  >
                    {currentUser.full_name
                      ? currentUser.full_name
                          .trim()
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : currentUser.email.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold truncate max-w-[120px]">
                    {currentUser.full_name || currentUser.email.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl z-40 space-y-1 animate-in fade-in zoom-in-95">
                      {/* User Header */}
                      <div className="px-3 py-2 border-b border-slate-100 space-y-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.full_name || "Opnly Member"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {currentUser.email}
                        </p>
                        <div className="pt-1">
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            Unified Account
                          </span>
                        </div>
                      </div>

                      {/* Profile & Capabilities */}
                      <button
                        onClick={() => {
                          handleNavigate("profile");
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/80 rounded-xl transition cursor-pointer text-left"
                      >
                        <UserIcon className="h-4 w-4 text-indigo-600" />
                        <span>My Profile & Capabilities</span>
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      {/* Sign Out */}
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left"
                      >
                        <LogOut className="h-4 w-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
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
            /* UNIFIED AI-POWERED WORKSPACE DASHBOARD (Issue #9)                         */
            /* ========================================================================= */
            <UnifiedWorkspaceView
              currentUser={currentUser}
              opportunities={opportunities}
              overview={overview}
              isLoadingOpps={oppLoading}
              oppError={oppError}
              onRetryOpps={() => loadOpportunities(selectedOppStatus)}
              onPostNeed={() => handleOpenNewStudio("SEEKING_SOLUTION")}
              onOfferCapability={() => handleOpenNewStudio("OFFERING_SOLUTION")}
              onBrowseOpportunities={(filter) => {
                if (filter === "needs") {
                  setStudioInitialIntent("SEEKING_SOLUTION");
                } else if (filter === "capabilities") {
                  setStudioInitialIntent("OFFERING_SOLUTION");
                }
                handleNavigate("opportunities", "explore");
              }}
              onViewMyOpportunities={() => handleNavigate("opportunities", "mine")}
              onViewConnections={() => handleNavigate("collaborations")}
              onOpenDealRooms={(roomId) => {
                if (roomId) {
                  if (roomId.startsWith("prop_")) {
                    handleOpenDealRoomFromProposal(roomId);
                    return;
                  }
                  setSelectedDealRoomId(roomId);
                }
                handleNavigate("deal-rooms");
              }}
              onSelectOpportunity={handleOpenExistingStudio}
              onViewMatches={() => handleNavigate("opportunities", "explore")}
              onViewLedger={() => handleNavigate("ledger")}
              onCompleteProfile={() => handleNavigate("profile")}
            />
          ) : currentView === "opportunities" ? (
            /* ========================================================================= */
            /* UNIFIED OPPORTUNITY NETWORK & WORKSPACE HUB                               */
            /* ========================================================================= */
            <div className="space-y-6 w-full">
              {/* Hub Segmented Tab Header */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                        {activeOppTab === "explore"
                          ? "Opportunity Discovery Feed"
                          : "My Opportunity Drafts & Listings"}
                      </h1>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                        Stage 1–5
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeOppTab === "explore"
                        ? "Search and connect with commercial needs and technical offerings across the network."
                        : "Manage and publish your captured ideas, structured models, and active commercial drafts."}
                    </p>
                  </div>

                  {/* Segmented Switcher & Primary Action */}
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-semibold">
                      <button
                        onClick={() => handleOppTabChange("explore")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                          activeOppTab === "explore"
                            ? "bg-white text-indigo-700 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Compass className="h-3.5 w-3.5" />
                        <span>Discover Network</span>
                      </button>
                      <button
                        onClick={() => handleOppTabChange("mine")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                          activeOppTab === "mine"
                            ? "bg-white text-indigo-700 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>My Opportunities ({opportunities.length})</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenNewStudio()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      <span>New Opportunity</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-View Content */}
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
                    onConnect={(opp) => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                        return;
                      }
                      setConnectTarget({
                        recipientUserId: opp.user_id || "owner_default",
                        recipientName: opp.creator_name || opp.business_name || "Opportunity Creator",
                        opportunityId: opp.id,
                        opportunityTitle: opp.title,
                      });
                    }}
                  />
                </section>
              ) : (
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
              )}
            </div>
          ) : currentView === "collaborations" ? (
            /* ========================================================================= */
            /* CONNECTIONS & PROPOSALS WORKSPACE                                         */
            /* ========================================================================= */
            <div className="space-y-6">
              <ConnectionsProposalsView
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenDealRoom={(proposalId) => {
                  handleOpenDealRoomFromProposal(proposalId);
                }}
              />
            </div>
          ) : currentView === "deal-rooms" ? (
            /* ========================================================================= */
            /* DEAL ROOMS COLLABORATION WORKSPACES                                       */
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
                  onOpenBrowse={() => handleNavigate("opportunities", "explore")}
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
              {/* Milestone Payouts & Invoicing Overview Banner */}
              <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-200">
                    <Receipt className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Commercial Invoicing & Milestone Settlement</span>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">
                    Milestone Earnings & Official Invoices
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Track your personal milestone releases, download official commercial invoices, and verify settled payouts. Fixed scope agreements remain managed inside their respective Deal Rooms.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavigate("deal-rooms")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                    <span>View Deal Rooms</span>
                  </button>
                </div>
              </div>

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

              <section aria-label="Commerce Ledger">
                <CommerceLedger
                  transactions={transactions}
                  loading={loading}
                  error={error}
                  selectedStatus={selectedStatus}
                  onFilterChange={handleFilterChange}
                  business={overview?.business}
                  currentUser={currentUser}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              </section>

              {/* Payment environment disclosure */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Payment Environment Configuration</span>
                </span>
                <span className="text-slate-500">
                  Payment actions require your approval. Confirm whether the server is configured for Sandbox or Live.
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <OpportunityStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
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
};
