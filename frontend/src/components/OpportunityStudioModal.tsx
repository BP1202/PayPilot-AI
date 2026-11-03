"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  AlertCircle,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  RotateCw,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  ArrowRight,
  Shield,
  FileText,
} from "lucide-react";
import {
  Opportunity,
  OpportunityType,
  OpportunityStatus,
  OpportunityVisibility,
  OpportunityAnalysisData,
  ProvenanceCategory,
} from "@/types";
import {
  analyzeOpportunity,
  createOpportunity,
  updateOpportunity,
  reanalyzeOpportunity,
} from "@/lib/api";

interface OpportunityStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (opportunity: Opportunity, message: string) => void;
  existingOpportunity?: Opportunity | null;
  businessId?: number | null;
}

export const OpportunityStudioModal: React.FC<OpportunityStudioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingOpportunity,
  businessId,
}) => {
  // Step 1: Capture (input & type), Step 2: Understand & Review
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [submissionType, setSubmissionType] = useState<OpportunityType>("IDEA");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis metadata & engine mode
  const [aiMode, setAiMode] = useState<string>("DETERMINISTIC_FALLBACK");
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number>(0.85);
  const [aiBannerMessage, setAiBannerMessage] = useState<string>("");

  // Editable Form Fields
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [targetCustomerSegments, setTargetCustomerSegments] = useState<string[]>([]);
  const [customerPainPoints, setCustomerPainPoints] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [businessModels, setBusinessModels] = useState<string[]>([]);
  const [keyAssumptions, setKeyAssumptions] = useState<string[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [provenanceMap, setProvenanceMap] = useState<Record<string, ProvenanceCategory>>({});

  // Input states for tag adding
  const [newSegment, setNewSegment] = useState("");
  const [newPainPoint, setNewPainPoint] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [newModel, setNewModel] = useState("");

  // Sync state if existingOpportunity changes or modal opens
  useEffect(() => {
    if (existingOpportunity) {
      setSubmissionType(existingOpportunity.submission_type);
      setDescriptionInput(existingOpportunity.original_description);
      setTitle(existingOpportunity.title);
      setIndustry(existingOpportunity.industry || "");
      setProblemStatement(existingOpportunity.problem_statement || "");
      setProposedSolution(existingOpportunity.proposed_solution || "");
      setValueProposition(existingOpportunity.value_proposition || "");
      setTargetCustomerSegments(existingOpportunity.target_customer_segments || []);
      setCustomerPainPoints(existingOpportunity.customer_pain_points || []);
      setRequiredSkills(existingOpportunity.required_skills_and_resources || []);
      setBusinessModels(existingOpportunity.potential_business_models || []);
      setKeyAssumptions(existingOpportunity.key_assumptions || []);
      setRisks(existingOpportunity.risks_and_uncertainties || []);
      setMissingInfo(existingOpportunity.missing_information || []);
      setFollowUpQuestions(existingOpportunity.suggested_follow_up_questions || []);
      setProvenanceMap(existingOpportunity.provenance || {});
      setAiMode(existingOpportunity.ai_metadata?.mode || "DETERMINISTIC_FALLBACK");
      setAiProvider(existingOpportunity.ai_metadata?.provider || null);
      setAiModel(existingOpportunity.ai_metadata?.model || null);
      setStep("review");
    } else {
      setStep("capture");
      setSubmissionType("IDEA");
      setDescriptionInput("");
      setTitle("");
      setIndustry("");
      setProblemStatement("");
      setProposedSolution("");
      setValueProposition("");
      setTargetCustomerSegments([]);
      setCustomerPainPoints([]);
      setRequiredSkills([]);
      setBusinessModels([]);
      setKeyAssumptions([]);
      setRisks([]);
      setMissingInfo([]);
      setFollowUpQuestions([]);
      setProvenanceMap({});
      setErrorMessage(null);
    }
  }, [existingOpportunity, isOpen]);

  if (!isOpen) return null;

  const handleUseIdeaExample = () => {
    setSubmissionType("IDEA");
    setDescriptionInput(
      "A decentralized freight tracking and cargo coordination platform for small fleet operators. Truckers install an IoT OBD sensor, and dispatchers track location, temperature, and maintenance alerts in real-time."
    );
  };

  const handleUseProblemExample = () => {
    setSubmissionType("PROBLEM");
    setDescriptionInput(
      "Independent clinics spend 15+ hours weekly manually reconciling medical billing codes and chasing delayed insurance claims with spreadsheets and phone calls."
    );
  };

  const populateFromAnalysis = (
    data: OpportunityAnalysisData,
    mode: string,
    provider?: string,
    model?: string,
    confidence?: number,
    message?: string
  ) => {
    setTitle(data.suggested_title || "");
    setIndustry(data.industry || "");
    setProblemStatement(data.problem_statement || "");
    setProposedSolution(data.proposed_solution || "");
    setValueProposition(data.value_proposition || "");
    setTargetCustomerSegments(data.target_customer_segments || []);
    setCustomerPainPoints(data.customer_pain_points || []);
    setRequiredSkills(data.required_skills_and_resources || []);
    setBusinessModels(data.potential_business_models || []);
    setKeyAssumptions(data.key_assumptions || []);
    setRisks(data.risks_and_uncertainties || []);
    setMissingInfo(data.missing_information || []);
    setFollowUpQuestions(data.suggested_follow_up_questions || []);
    setProvenanceMap(data.provenance || {});

    setAiMode(mode);
    setAiProvider(provider || null);
    setAiModel(model || null);
    setAiConfidence(confidence || 0.85);
    setAiBannerMessage(message || "");
  };

  const handleAnalyze = async () => {
    if (!descriptionInput.trim() || descriptionInput.trim().length < 10) {
      setErrorMessage("Please enter at least 10 characters describing your idea or problem.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);

      const res = await analyzeOpportunity(
        submissionType,
        descriptionInput.trim(),
        businessId || undefined
      );

      populateFromAnalysis(
        res.analysis,
        res.mode,
        res.provider,
        res.model,
        res.confidence,
        res.message
      );

      setStep("review");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "We couldn't analyze your submission right now. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!descriptionInput.trim() || descriptionInput.trim().length < 10) {
      setErrorMessage("Please enter at least 10 characters to reanalyze.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);

      if (existingOpportunity) {
        const updated = await reanalyzeOpportunity(
          existingOpportunity.id,
          descriptionInput.trim(),
          submissionType,
          true
        );
        onSuccess(updated, `Opportunity "${updated.title}" successfully reanalyzed and updated.`);
        onClose();
      } else {
        const res = await analyzeOpportunity(
          submissionType,
          descriptionInput.trim(),
          businessId || undefined
        );
        populateFromAnalysis(
          res.analysis,
          res.mode,
          res.provider,
          res.model,
          res.confidence,
          res.message
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "We couldn't reanalyze your opportunity right now. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a title for this opportunity.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      if (existingOpportunity) {
        const updated = await updateOpportunity(existingOpportunity.id, {
          title: title.trim(),
          original_description: descriptionInput.trim(),
          industry: industry.trim(),
          problem_statement: problemStatement.trim(),
          proposed_solution: proposedSolution.trim(),
          value_proposition: valueProposition.trim(),
          target_customer_segments: targetCustomerSegments,
          customer_pain_points: customerPainPoints,
          required_skills_and_resources: requiredSkills,
          potential_business_models: businessModels,
          key_assumptions: keyAssumptions,
          risks_and_uncertainties: risks,
          missing_information: missingInfo,
          suggested_follow_up_questions: followUpQuestions,
          provenance: provenanceMap,
          status: "ANALYSED" as OpportunityStatus,
          visibility: "PRIVATE" as OpportunityVisibility,
        });

        onSuccess(updated, `Opportunity draft "${updated.title}" updated.`);
      } else {
        const created = await createOpportunity({
          submission_type: submissionType,
          title: title.trim(),
          original_description: descriptionInput.trim(),
          industry: industry.trim(),
          problem_statement: problemStatement.trim(),
          proposed_solution: proposedSolution.trim(),
          value_proposition: valueProposition.trim(),
          target_customer_segments: targetCustomerSegments,
          customer_pain_points: customerPainPoints,
          required_skills_and_resources: requiredSkills,
          potential_business_models: businessModels,
          key_assumptions: keyAssumptions,
          risks_and_uncertainties: risks,
          missing_information: missingInfo,
          suggested_follow_up_questions: followUpQuestions,
          provenance: provenanceMap,
          ai_metadata: {
            mode: aiMode,
            provider: aiProvider,
            model: aiModel,
            confidence: aiConfidence,
          },
          business_id: businessId || undefined,
          status: "ANALYSED" as OpportunityStatus,
          visibility: "PRIVATE" as OpportunityVisibility,
        });

        onSuccess(created, `Opportunity draft "${created.title}" successfully saved.`);
      }

      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "We couldn't save your opportunity draft right now. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const getProvenanceBadge = (fieldKey: string) => {
    const prov = provenanceMap[fieldKey];
    if (prov === "USER_PROVIDED") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> User Fact
        </span>
      );
    }
    if (prov === "AI_HYPOTHESIS") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
          <Sparkles className="h-3 w-3" /> AI Hypothesis
        </span>
      );
    }
    if (prov === "MISSING_UNKNOWN") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-200">
          <HelpCircle className="h-3 w-3" /> Needed Context
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-200">
        <Sparkles className="h-3 w-3" /> AI Suggestion
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="studio-title" className="text-lg font-bold text-slate-900">
                  {existingOpportunity ? "Edit Opportunity Draft" : "Idea Capture & Opportunity Studio"}
                </h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                  Stage 1 & 2
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Capture raw ideas or problems, then structure them into a validated commercial opportunity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {step === "capture" ? (
            /* ========================================================================= */
            /* STAGE 1: CAPTURE STUDIO                                                   */
            /* ========================================================================= */
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  What are you submitting today?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSubmissionType("IDEA")}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      submissionType === "IDEA"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        submissionType === "IDEA"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">I have an Idea</p>
                      <p className="text-xs text-slate-500 mt-1">
                        You have a solution, product concept, or business initiative you want to build and monetize.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionType("PROBLEM")}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      submissionType === "PROBLEM"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        submissionType === "PROBLEM"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">I have a Problem</p>
                      <p className="text-xs text-slate-500 mt-1">
                        You or your business face an acute pain point or inefficiency that needs a commercial solution.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="opp-desc" className="text-sm font-semibold text-slate-900">
                    Describe your {submissionType === "IDEA" ? "idea" : "problem"} in plain language:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={submissionType === "IDEA" ? handleUseIdeaExample : handleUseProblemExample}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Use example text
                    </button>
                  </div>
                </div>
                <textarea
                  id="opp-desc"
                  rows={6}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder={
                    submissionType === "IDEA"
                      ? "Explain what you want to create, who would use it, and how it solves a commercial need. No formal business plan needed..."
                      : "Describe the specific bottleneck, manual waste, or financial cost caused by this problem, and who experiences it..."
                  }
                  className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1.5 px-1">
                  <span>Minimum 10 characters</span>
                  <span>{descriptionInput.length} characters</span>
                </div>
              </div>

              {/* Guiding Principles Card */}
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 mb-1">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>Confidentiality & Anti-Hallucination Guarantees</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Your submission remains completely private in Draft mode.</li>
                  <li>AI will never fabricate unverified market traction, customer revenue, or fake investors.</li>
                  <li>You review, edit, and approve every hypothesis before anything is persisted.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* STAGE 2: UNDERSTAND & REVIEW STUDIO                                       */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* AI Engine Provenance Banner */}
              <div
                className={`rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  aiMode === "LIVE_AI"
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                    : "border-amber-200 bg-amber-50/70 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      aiMode === "LIVE_AI" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                    }`}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {aiMode === "LIVE_AI"
                          ? `Live AI Analysis (${aiProvider} ${aiModel || ""})`
                          : "Deterministic Heuristic Engine (Offline Mode)"}
                      </span>
                      <span className="text-[11px] rounded bg-white/80 px-2 py-0.5 font-semibold">
                        {(aiConfidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-90">
                      {aiBannerMessage ||
                        "AI has extracted structured hypotheses from your description. Review and adjust below."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("capture")}
                  className="text-xs font-semibold underline hover:opacity-80 transition"
                >
                  Edit original text
                </button>
              </div>

              {/* Core Opportunity Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Opportunity Title
                    </label>
                    {getProvenanceBadge("suggested_title")}
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Concise commercial title..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Industry / Sector</label>
                    {getProvenanceBadge("industry")}
                  </div>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Logistics & Freight"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Submission Type</label>
                    <span className="text-[11px] font-semibold text-slate-500">Fixed</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={submissionType === "IDEA" ? "Commercial Idea" : "Real-World Problem"}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-600"
                  />
                </div>
              </div>

              {/* Problem & Solution Dual Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Problem Statement</label>
                    {getProvenanceBadge("problem_statement")}
                  </div>
                  <textarea
                    rows={4}
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    placeholder="Articulate the core friction..."
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Proposed Solution</label>
                    {getProvenanceBadge("proposed_solution")}
                  </div>
                  <textarea
                    rows={4}
                    value={proposedSolution}
                    onChange={(e) => setProposedSolution(e.target.value)}
                    placeholder="Articulate the proposed approach..."
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Value Proposition */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">Core Value Proposition</label>
                  {getProvenanceBadge("value_proposition")}
                </div>
                <textarea
                  rows={2}
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="Primary measurable value delivered to customers..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Customer Segments & Pain Points Lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Target Customer Segments</label>
                    {getProvenanceBadge("target_customer_segments")}
                  </div>
                  <div className="space-y-2">
                    {targetCustomerSegments.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => setTargetCustomerSegments(targetCustomerSegments.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSegment}
                        onChange={(e) => setNewSegment(e.target.value)}
                        placeholder="Add customer segment..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSegment.trim()) {
                            e.preventDefault();
                            setTargetCustomerSegments([...targetCustomerSegments, newSegment.trim()]);
                            setNewSegment("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSegment.trim()) {
                            setTargetCustomerSegments([...targetCustomerSegments, newSegment.trim()]);
                            setNewSegment("");
                          }
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Customer Pain Points</label>
                    {getProvenanceBadge("customer_pain_points")}
                  </div>
                  <div className="space-y-2">
                    {customerPainPoints.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => setCustomerPainPoints(customerPainPoints.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPainPoint}
                        onChange={(e) => setNewPainPoint(e.target.value)}
                        placeholder="Add pain point..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newPainPoint.trim()) {
                            e.preventDefault();
                            setCustomerPainPoints([...customerPainPoints, newPainPoint.trim()]);
                            setNewPainPoint("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newPainPoint.trim()) {
                            setCustomerPainPoints([...customerPainPoints, newPainPoint.trim()]);
                            setNewPainPoint("");
                          }
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Monetization Models */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Required Skills & Resources</label>
                    {getProvenanceBadge("required_skills_and_resources")}
                  </div>
                  <div className="space-y-2">
                    {requiredSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => setRequiredSkills(requiredSkills.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add skill or resource..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSkill.trim()) {
                            e.preventDefault();
                            setRequiredSkills([...requiredSkills, newSkill.trim()]);
                            setNewSkill("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSkill.trim()) {
                            setRequiredSkills([...requiredSkills, newSkill.trim()]);
                            setNewSkill("");
                          }
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Potential Business Models</label>
                    {getProvenanceBadge("potential_business_models")}
                  </div>
                  <div className="space-y-2">
                    {businessModels.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => setBusinessModels(businessModels.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder="Add business model..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newModel.trim()) {
                            e.preventDefault();
                            setBusinessModels([...businessModels, newModel.trim()]);
                            setNewModel("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newModel.trim()) {
                            setBusinessModels([...businessModels, newModel.trim()]);
                            setNewModel("");
                          }
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assumptions & Missing Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900">Key Hypotheses to Validate</span>
                    {getProvenanceBadge("key_assumptions")}
                  </div>
                  <ul className="text-xs text-amber-950 space-y-1.5 list-disc list-inside">
                    {keyAssumptions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-900">Missing Information</span>
                    {getProvenanceBadge("missing_information")}
                  </div>
                  <ul className="text-xs text-sky-950 space-y-1.5 list-disc list-inside">
                    {missingInfo.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Strategic Follow-Up Prompts */}
              {followUpQuestions.length > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-900">Strategic Questions for Next Stage</span>
                    {getProvenanceBadge("suggested_follow_up_questions")}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-indigo-950">
                    {followUpQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <span className="font-bold text-indigo-600">{idx + 1}.</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          {step === "capture" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !descriptionInput.trim()}
                className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing Concept...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze with AI Business Analyst</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep("capture")}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Text
                </button>
                <button
                  type="button"
                  onClick={handleReanalyze}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>Re-analyze</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving || !title.trim()}
                  className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save Opportunity Draft</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

