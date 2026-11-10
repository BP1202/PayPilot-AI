import React from "react";
import {
  ShieldCheck,
  Sparkles,
  Building2,
  PlusCircle,
  Lightbulb,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Business, User } from "@/types";

interface HeaderProps {
  business?: Business | null;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onCreateProfile?: () => void;
  onCreateOpportunity?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  business,
  currentUser,
  onOpenAuth,
  onSignOut,
  onCreateProfile,
  onCreateOpportunity,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">Opnly</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                MVP Demo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Idea-to-Business Opportunity Network
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden lg:flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-900">
              {business ? business.name : currentUser?.full_name ? `${currentUser.full_name}'s Venture` : "Opnly Network"}
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-indigo-600">
              {business?.currency || "USD"}
            </span>
          </div>

          {onCreateOpportunity && (
            <button
              onClick={onCreateOpportunity}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              aria-label="Capture opportunity"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Capture Opportunity</span>
            </button>
          )}

          {onCreateProfile && (
            <button
              onClick={onCreateProfile}
              className="hidden sm:flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              aria-label="Create business profile"
            >
              <PlusCircle className="h-3.5 w-3.5 text-slate-500" />
              <span>Business Profile</span>
            </button>
          )}

          {/* User Authentication State */}
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                <UserIcon className="h-3.5 w-3.5 text-indigo-600" />
                <span className="max-w-[120px] truncate">
                  {currentUser.full_name || currentUser.email}
                </span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
                  aria-label="Sign out"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                aria-label="Sign in"
              >
                <LogIn className="h-3.5 w-3.5 text-indigo-600" />
                <span>Sign In</span>
              </button>
            )
          )}

          <div className="hidden md:flex items-center space-x-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>PayPal Simulated Sandbox</span>
          </div>
        </div>
      </div>
    </header>
  );
};
