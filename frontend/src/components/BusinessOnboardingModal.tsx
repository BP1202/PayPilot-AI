"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Building2,
  Globe,
  DollarSign,
  Briefcase,
  MapPin,
  CheckCircle2,
  X,
  ArrowRight,
  AlertCircle,
  Loader2,
  PenLine,
} from "lucide-react";
import { Business, BusinessProfileExtraction } from "@/types";
import { extractBusinessProfile, createBusinessProfile } from "@/lib/api";

interface BusinessOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBusiness: Business) => void;
}

const COMMON_CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD", "AUD", "SGD", "JPY"];

export const BusinessOnboardingModal: React.FC<BusinessOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Step 1: Prompt input, Step 2: Review & Edit form
  const [step, setStep] = useState<"input" | "review">("input");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [finalDescription, setFinalDescription] = useState("");
  const [extractedFields, setExtractedFields] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleStartManual = () => {
    setName("");
    setIndustry("");
    setBusinessType("");
    setCountry("");
    setWebsite("");
    setCurrency("USD");
    setFinalDescription(descriptionInput.trim());
    setExtractedFields([]);
    setErrorMessage(null);
    setStep("review");
  };

  const handleExtractWithAI = async () => {
    if (!descriptionInput.trim()) {
      setErrorMessage("Please enter a short description of your business to extract details.");
      return;
    }

    try {
      setIsExtracting(true);
      setErrorMessage(null);

      const extraction: BusinessProfileExtraction = await extractBusinessProfile(
        descriptionInput.trim()
      );

      // Populate form fields with extracted suggestions
      setName(extraction.name || "");
      setIndustry(extraction.industry || "");
      setBusinessType(extraction.business_type || "");
      setCountry(extraction.country || "");
      setWebsite(extraction.website || "");
      setCurrency(extraction.currency || "USD");
      setFinalDescription(extraction.description || descriptionInput.trim());
      setExtractedFields(extraction.extracted_fields || []);

      setStep("review");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "We couldn't analyze the business description right now. You can enter details manually.";
      setErrorMessage(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Business name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const payload = {
        name: name.trim(),
        currency: currency.toUpperCase().trim(),
        industry: industry.trim() || undefined,
        business_type: businessType.trim() || undefined,
        country: country.trim() || undefined,
        website: website.trim() || undefined,
        description: finalDescription.trim() || undefined,
      };

      const created = await createBusinessProfile(payload);
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to save your business profile right now. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToInput = () => {
    setErrorMessage(null);
    setStep("input");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Create Business Profile
              </h2>
              <p className="text-xs text-slate-500">
                {step === "input"
                  ? "Describe your company or let AI draft your profile"
                  : "Review, edit, and confirm your business details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start space-x-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Prompt Input */}
        {step === "input" && (
          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="business-description-prompt"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Describe Your Business
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Mention your company name, what you sell, where you are based, and how you receive payments.
              </p>
              <textarea
                id="business-description-prompt"
                rows={4}
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Describe what your business does and what you need."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            <div className="flex items-center justify-end text-xs text-slate-500 pt-1">
              <span>Anti-hallucination: only stated facts are extracted</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleStartManual}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5"
              >
                <PenLine className="h-4 w-4" />
                <span>Fill Manually</span>
              </button>
              <button
                type="button"
                onClick={handleExtractWithAI}
                disabled={isExtracting || !descriptionInput.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Auto-fill with AI</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review and Edit Form */}
        {step === "review" && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-3 text-xs text-indigo-900 flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Review and edit your profile. </span>
                <span>
                  All fields are editable. Nothing is saved to your account until you confirm below.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Name */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="field-name"
                  className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Business Name *</span>
                  </span>
                  {extractedFields.includes("name") && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                      AI Suggested
                    </span>
                  )}
                </label>
                <input
                  id="field-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., ABC Company"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Industry */}
              <div>
                <label
                  htmlFor="field-industry"
                  className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    <span>Industry</span>
                  </span>
                  {extractedFields.includes("industry") && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                      AI Suggested
                    </span>
                  )}
                </label>
                <input
                  id="field-industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Electronics, Manufacturing"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Business Type */}
              <div>
                <label
                  htmlFor="field-type"
                  className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Business Type</span>
                  </span>
                  {extractedFields.includes("business_type") && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                      AI Suggested
                    </span>
                  )}
                </label>
                <input
                  id="field-type"
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g., Wholesaler, Retailer, Service Provider"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Country */}
              <div>
                <label
                  htmlFor="field-country"
                  className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Country</span>
                  </span>
                  {extractedFields.includes("country") && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                      AI Suggested
                    </span>
                  )}
                </label>
                <input
                  id="field-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., India, United States"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Currency */}
              <div>
                <label
                  htmlFor="field-currency"
                  className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                    <span>Default Currency</span>
                  </span>
                  {extractedFields.includes("currency") && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                      AI Suggested
                    </span>
                  )}
                </label>
                <select
                  id="field-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                >
                  {COMMON_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Website (optional, empty if none) */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="field-website"
                  className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    <span>Website (leave blank if none)</span>
                  </span>
                  {extractedFields.includes("website") ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                      AI Suggested
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Optional</span>
                  )}
                </label>
                <input
                  id="field-website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g., https://example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="field-desc"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Business Summary
                </label>
                <textarea
                  id="field-desc"
                  rows={2}
                  value={finalDescription}
                  onChange={(e) => setFinalDescription(e.target.value)}
                  placeholder="Summary of business operations"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetToInput}
                className="text-xs font-medium text-slate-600 hover:text-slate-800 transition"
              >
                ← Back to description
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save Business Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
