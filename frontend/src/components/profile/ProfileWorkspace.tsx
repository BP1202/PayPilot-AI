"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Globe,
  Sparkles,
  Save,
  Plus,
  X,
  RefreshCw,
  Shield,
  Layers,
} from "lucide-react";
import {
  Business,
  IndividualProfile,
  ProfileVisibility,
  User as UserType,
} from "@/types";
import {
  fetchMyProfiles,
  updateMyIndividualProfile,
  updateMyBusinessProfile,
} from "@/lib/api";

interface ProfileWorkspaceProps {
  currentUser?: UserType | null;
  onOpenAuth?: () => void;
  activeRole?: "seeker" | "creator";
  initialTab?: "individual" | "organization";
}

export const ProfileWorkspace: React.FC<ProfileWorkspaceProps> = ({
  currentUser,
  onOpenAuth,
  activeRole = "seeker",
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<"individual" | "organization">(
    initialTab || (activeRole === "creator" ? "organization" : "individual")
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (activeRole === "creator") {
      setActiveTab("organization");
    } else {
      setActiveTab("individual");
    }
  }, [initialTab, activeRole]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile data
  const [individual, setIndividual] = useState<IndividualProfile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(
    null
  );

  // Individual Form State
  const [indHeadline, setIndHeadline] = useState("");
  const [indBio, setIndBio] = useState("");
  const [indLocation, setIndLocation] = useState("");
  const [indIndustry, setIndIndustry] = useState("");
  const [indSkills, setIndSkills] = useState<string[]>([]);
  const [indInterests, setIndInterests] = useState<string[]>([]);
  const [indVisibility, setIndVisibility] =
    useState<ProfileVisibility>("PRIVATE");
  const [newIndSkill, setNewIndSkill] = useState("");
  const [newIndInterest, setNewIndInterest] = useState("");

  // Organization Form State
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgIndustry, setOrgIndustry] = useState("");
  const [orgBusinessType, setOrgBusinessType] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgCountry, setOrgCountry] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgSkills, setOrgSkills] = useState<string[]>([]);
  const [orgInterests, setOrgInterests] = useState<string[]>([]);
  const [orgVisibility, setOrgVisibility] =
    useState<ProfileVisibility>("PRIVATE");
  const [newOrgSkill, setNewOrgSkill] = useState("");
  const [newOrgInterest, setNewOrgInterest] = useState("");

  const loadProfiles = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchMyProfiles();
      setIndividual(data.individual);
      setBusinesses(data.businesses || []);

      // Populate individual form
      setIndHeadline(data.individual.headline || "");
      setIndBio(data.individual.bio || "");
      setIndLocation(data.individual.location || "");
      setIndIndustry(data.individual.industry || "TECH");
      setIndSkills(data.individual.skills || []);
      setIndInterests(data.individual.interests || []);
      setIndVisibility(data.individual.visibility || "PRIVATE");

      // Populate organization form with first business
      if (data.businesses && data.businesses.length > 0) {
        const firstBiz = data.businesses[0];
        setSelectedBusinessId(firstBiz.id);
        populateOrgForm(firstBiz);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to load profiles. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const populateOrgForm = (biz: Business) => {
    setOrgName(biz.name || "");
    setOrgDescription(biz.description || "");
    setOrgIndustry(biz.industry || "BUSINESS");
    setOrgBusinessType(biz.business_type || "");
    setOrgLocation(biz.location || "");
    setOrgCountry(biz.country || "");
    setOrgWebsite(biz.website || "");
    setOrgSkills(biz.skills || []);
    setOrgInterests(biz.interests || []);
    setOrgVisibility(biz.visibility || "PRIVATE");
  };

  const handleSelectBusiness = (bizId: number) => {
    setSelectedBusinessId(bizId);
    const target = businesses.find((b) => b.id === bizId);
    if (target) {
      populateOrgForm(target);
    }
  };

  const handleAddIndSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newIndSkill.trim();
    if (trimmed && !indSkills.includes(trimmed)) {
      setIndSkills([...indSkills, trimmed]);
      setNewIndSkill("");
    }
  };

  const handleRemoveIndSkill = (skill: string) => {
    setIndSkills(indSkills.filter((s) => s !== skill));
  };

  const handleAddIndInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newIndInterest.trim();
    if (trimmed && !indInterests.includes(trimmed)) {
      setIndInterests([...indInterests, trimmed]);
      setNewIndInterest("");
    }
  };

  const handleRemoveIndInterest = (interest: string) => {
    setIndInterests(indInterests.filter((i) => i !== interest));
  };

  const handleAddOrgSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newOrgSkill.trim();
    if (trimmed && !orgSkills.includes(trimmed)) {
      setOrgSkills([...orgSkills, trimmed]);
      setNewOrgSkill("");
    }
  };

  const handleRemoveOrgSkill = (skill: string) => {
    setOrgSkills(orgSkills.filter((s) => s !== skill));
  };

  const handleAddOrgInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newOrgInterest.trim();
    if (trimmed && !orgInterests.includes(trimmed)) {
      setOrgInterests([...orgInterests, trimmed]);
      setNewOrgInterest("");
    }
  };

  const handleRemoveOrgInterest = (interest: string) => {
    setOrgInterests(orgInterests.filter((i) => i !== interest));
  };

  const handleSaveIndividual = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    try {
      const updated = await updateMyIndividualProfile({
        headline: indHeadline,
        bio: indBio,
        location: indLocation,
        industry: indIndustry,
        skills: indSkills,
        interests: indInterests,
        visibility: indVisibility,
      });
      setIndividual(updated);
      setSaveSuccess("Individual profile updated successfully!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!selectedBusinessId) {
      setErrorMessage("No organization profile selected.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    try {
      const updated = await updateMyBusinessProfile(selectedBusinessId, {
        name: orgName,
        description: orgDescription,
        industry: orgIndustry,
        business_type: orgBusinessType,
        location: orgLocation,
        country: orgCountry,
        website: orgWebsite,
        skills: orgSkills,
        interests: orgInterests,
        visibility: orgVisibility,
      });
      setBusinesses(
        businesses.map((b) => (b.id === selectedBusinessId ? updated : b))
      );
      setSaveSuccess("Organization profile updated successfully!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to update organization profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-inner">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Sign In to Access Your Profiles
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
          Manage your individual professional identity and organization
          capabilities. Your profile powers secure collaboration across the
          Opnly Opportunity Network.
        </p>
        <button
          onClick={onOpenAuth}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition cursor-pointer"
        >
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  const currentBusiness = businesses.find((b) => b.id === selectedBusinessId);
  const indCompleteness = individual?.completeness_percent ?? 0;
  const indMissing = individual?.missing_fields ?? [];
  const orgCompleteness = currentBusiness?.completeness_percent ?? 0;
  const orgMissing = currentBusiness?.missing_fields ?? [];

  return (
    <div className="space-y-6">
      {/* Header and Tab Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Profiles & Identity
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200">
              Two-Sided Network
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your individual professional credentials and organization
            profiles with cryptographic privacy control.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("individual")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
              activeTab === "individual"
                ? "bg-white text-blue-700 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="h-3.5 w-3.5 text-blue-600" />
            <span>Individual Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("organization")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
              activeTab === "organization"
                ? "bg-white text-emerald-700 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Organization Profile</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">
            Loading profile information...
          </p>
        </div>
      ) : activeTab === "individual" ? (
        /* ========================================================================= */
        /* INDIVIDUAL PROFILE TAB                                                    */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (Left 2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Personal & Professional Details
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Isolated 1:1 Identity</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer & System Architect"
                  value={indHeadline}
                  onChange={(e) => setIndHeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bio / Background
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your capabilities, history, and what commercial opportunities you build..."
                  value={indBio}
                  onChange={(e) => setIndBio(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Industry / Sector
                </label>
                <select
                  value={indIndustry}
                  onChange={(e) => setIndIndustry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                >
                  <option value="TECH">Technology & Software</option>
                  <option value="FINTECH">Financial Technology</option>
                  <option value="BUSINESS">Business & Commerce</option>
                  <option value="LOCAL">Local & Manufacturing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA or Remote"
                  value={indLocation}
                  onChange={(e) => setIndLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>
            </div>

            {/* Skills Tag Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Skills & Capabilities
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {indSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIndSkill(skill)}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a skill (e.g. Python, Next.js, Cloud Architecture)..."
                  value={newIndSkill}
                  onChange={(e) => setNewIndSkill(e.target.value)}
                  onKeyDown={handleAddIndSkill}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={handleAddIndSkill}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Interests Tag Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Collaboration Interests
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {indInterests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs font-semibold text-violet-700"
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIndInterest(interest)}
                      className="text-violet-400 hover:text-violet-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add an interest (e.g. Fintech, Open Source, Startup Partnerships)..."
                  value={newIndInterest}
                  onChange={(e) => setNewIndInterest(e.target.value)}
                  onKeyDown={handleAddIndInterest}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={handleAddIndInterest}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Visibility Selector */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Profile Visibility Policy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    indVisibility === "PRIVATE"
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="ind_vis"
                      checked={indVisibility === "PRIVATE"}
                      onChange={() => setIndVisibility("PRIVATE")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">Private</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Visible only to you. Hidden from network search and public ID
                    reads.
                  </p>
                </label>

                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    indVisibility === "AUTHENTICATED"
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="ind_vis"
                      checked={indVisibility === "AUTHENTICATED"}
                      onChange={() => setIndVisibility("AUTHENTICATED")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">Members Only</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Visible to verified signed-in platform participants.
                  </p>
                </label>

                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    indVisibility === "PUBLIC"
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="ind_vis"
                      checked={indVisibility === "PUBLIC"}
                      onChange={() => setIndVisibility("PUBLIC")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">Public</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Discoverable across the web and opportunity network.
                  </p>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveIndividual}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Individual Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Completeness & Sidebar Card (Right col) */}
          <div className="space-y-5">
            {/* Completeness Meter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Profile Completeness
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-indigo-600">
                  {indCompleteness}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${indCompleteness}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-700">
                  Completeness Checklist
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {indMissing.includes("headline") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        indMissing.includes("headline")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Headline added
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {indMissing.includes("bio") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        indMissing.includes("bio")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Bio / background filled
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {indMissing.includes("industry") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        indMissing.includes("industry")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Industry selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {indMissing.includes("location") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        indMissing.includes("location")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Location specified
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {indMissing.includes("skills") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        indMissing.includes("skills")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      At least one skill listed
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {indMissing.includes("interests") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        indMissing.includes("interests")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      At least one interest specified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/70 p-4">
              <div className="flex items-center gap-2 mb-2 text-indigo-900">
                <Shield className="h-4 w-4" />
                <h4 className="text-xs font-bold">Privacy Guarantee</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Your email, password hashes, and authorization tokens are strictly
                isolated and never exposed in public profile payloads or opportunity
                matching feeds.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ORGANIZATION PROFILE TAB                                                  */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (Left 2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Organization & Entity Details
                </h2>
                <p className="text-[11px] text-slate-500">
                  Connect commercial agreements, contracts, and opportunities to
                  your verified business entity.
                </p>
              </div>

              {businesses.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Entity:
                  </label>
                  <select
                    value={selectedBusinessId || ""}
                    onChange={(e) =>
                      handleSelectBusiness(Number(e.target.value))
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:outline-hidden"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organization / Legal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Precision Gearworks"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Classification / Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Manufacturer, Wholesaler, Agency"
                  value={orgBusinessType}
                  onChange={(e) => setOrgBusinessType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organization Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your organization's core operations, products, and services..."
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Industry / Sector
                </label>
                <select
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                >
                  <option value="BUSINESS">Business & Commerce</option>
                  <option value="TECH">Technology & Software</option>
                  <option value="FINTECH">Financial Technology</option>
                  <option value="LOCAL">Local & Manufacturing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Austin, TX"
                  value={orgLocation}
                  onChange={(e) => setOrgLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States"
                  value={orgCountry}
                  onChange={(e) => setOrgCountry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>
            </div>

            {/* Org Capabilities Tag Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Organization Capabilities & Services
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {orgSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOrgSkill(skill)}
                      className="text-emerald-500 hover:text-emerald-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add capability (e.g. CNC Precision Machining, High-Volume Fulfillment)..."
                  value={newOrgSkill}
                  onChange={(e) => setNewOrgSkill(e.target.value)}
                  onKeyDown={handleAddOrgSkill}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={handleAddOrgSkill}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Org Interests Tag Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Partner & Resource Interests
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {orgInterests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800"
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOrgInterest(interest)}
                      className="text-amber-500 hover:text-amber-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add partner interest (e.g. Aerospace Sensors, Titanium Supply Chain)..."
                  value={newOrgInterest}
                  onChange={(e) => setNewOrgInterest(e.target.value)}
                  onKeyDown={handleAddOrgInterest}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={handleAddOrgInterest}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Visibility Policy */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Organization Visibility Policy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    orgVisibility === "PRIVATE"
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="org_vis"
                      checked={orgVisibility === "PRIVATE"}
                      onChange={() => setOrgVisibility("PRIVATE")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">Private</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Only owner can view entity profile.
                  </p>
                </label>

                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    orgVisibility === "AUTHENTICATED"
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="org_vis"
                      checked={orgVisibility === "AUTHENTICATED"}
                      onChange={() => setOrgVisibility("AUTHENTICATED")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">Members Only</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Visible to verified registered users.
                  </p>
                </label>

                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    orgVisibility === "PUBLIC"
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="org_vis"
                      checked={orgVisibility === "PUBLIC"}
                      onChange={() => setOrgVisibility("PUBLIC")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">Public</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Publicly discoverable on the Opportunity Network.
                  </p>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveOrganization}
                disabled={isSaving || !selectedBusinessId}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Organization Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Completeness & Sidebar Card (Right col) */}
          <div className="space-y-5">
            {/* Completeness Meter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Entity Completeness
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-600">
                  {orgCompleteness}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${orgCompleteness}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-700">
                  Entity Checklist
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {orgMissing.includes("name") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        orgMissing.includes("name")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Organization name set
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {orgMissing.includes("description") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        orgMissing.includes("description")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Description provided
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {orgMissing.includes("industry") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        orgMissing.includes("industry")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Industry specified
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {orgMissing.includes("location") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        orgMissing.includes("location")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Location or country set
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {orgMissing.includes("skills") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        orgMissing.includes("skills")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Skills / services capability added
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {orgMissing.includes("interests") ? (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span
                      className={
                        orgMissing.includes("interests")
                          ? "text-slate-500"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      Interests / resources specified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunity Linking Info */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/70 p-4">
              <div className="flex items-center gap-2 mb-2 text-emerald-900">
                <Layers className="h-4 w-4" />
                <h4 className="text-xs font-bold">Opportunity Ownership</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                When you create or publish an opportunity, you can link it directly
                to your verified organization entity to display credibility and
                streamline commercial transactions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

