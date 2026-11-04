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
  Target,
  Rocket,
  CreditCard,
  Code2,
  Briefcase,
  MapPin,
} from "lucide-react";
import {
  Opportunity,
  OpportunityType,
  OpportunityIntent,
  OpportunityCategory,
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
  initialIntent?: OpportunityIntent;
  initialCategory?: OpportunityCategory;
}

export const OpportunityStudioModal: React.FC<OpportunityStudioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingOpportunity,
  businessId,
  initialIntent,
  initialCategory,
}) => {
  // Step 1: Capture (input & type), Step 2: Understand & Review
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [submissionType, setSubmissionType] = useState<OpportunityType>("IDEA");
  const [intent, setIntent] = useState<OpportunityIntent>(initialIntent || "SEEKING_SOLUTION");
  const [category, setCategory] = useState<OpportunityCategory>(initialCategory || "BUSINESS");
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
      setIntent(existingOpportunity.intent || "SEEKING_SOLUTION");
      setCategory(existingOpportunity.category || "BUSINESS");
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
      setAiConfidence(existingOpportunity.ai_metadata?.confidence ?? 0.85);
      setAiBannerMessage(existingOpportunity.ai_metadata?.message || "");
      setStep("review");
    } else {
      setStep("capture");
      setSubmissionType("IDEA");
      setIntent(initialIntent || "SEEKING_SOLUTION");
      setCategory(initialCategory || "BUSINESS");
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
  }, [existingOpportunity, isOpen, initialIntent, initialCategory]);

  if (!isOpen) return null;

  const handleUseIdeaExample = () => {
    setSubmissionType("IDEA");
    setIntent("OFFERING_SOLUTION");
    setCategory("TECH");
    setDescriptionInput(
      "A decentralized freight tracking and cargo coordination platform for small fleet operators. Truckers install an IoT OBD sensor, and dispatchers track location, temperature, and maintenance alerts in real-time."
    );
  };

  const handleUseProblemExample = () => {
    setSubmissionType("PROBLEM");
    setIntent("SEEKING_SOLUTION");
    setCategory("BUSINESS");
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
    setAiConfidence(confidence ?? 0.85);
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
      if (
        msg.toLowerCase().includes("credentials") ||
        msg.toLowerCase().includes("authentication") ||
        msg.toLowerCase().includes("log in") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        setErrorMessage("Please sign in or create an account to save your opportunity draft.");
      } else {
        setErrorMessage(msg);
      }
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
      if (
        msg.toLowerCase().includes("credentials") ||
        msg.toLowerCase().includes("authentication") ||
        msg.toLowerCase().includes("log in") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        setErrorMessage("Please sign in or create an account to save your opportunity draft.");
      } else {
        setErrorMessage(msg);
      }
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
          intent,
          category,
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
          intent,
          category,
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

        onSuccess(created, `Opportunity draft "${created.title}" successfully created!`);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to save your opportunity draft. Please try again.";
      if (
        msg.toLowerCase().includes("credentials") ||
        msg.toLowerCase().includes("authentication") ||
        msg.toLowerCase().includes("log in") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        setErrorMessage("Please sign in or create an account to save your opportunity draft.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for array manipulations
  const addTag = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    fieldName: string
  ) => {
    if (!value.trim()) return;
    if (!list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setProvenanceMap((prev) => ({ ...prev, [fieldName]: "USER_PROVIDED" }));
    }
    setInput("");
  };

  const removeTag = (
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  const getProvenanceBadge = (fieldKey: string) => {
    const prov = provenanceMap[fieldKey];
    if (prov === "USER_PROVIDED") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          User Fact
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
                  Two-Sided Opportunity Network
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Structure your needs or offerings into a validated commercial opportunity.
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
              {/* TWO-SIDED INTENT SELECTION */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  What is your primary intent?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIntent("SEEKING_SOLUTION")}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      intent === "SEEKING_SOLUTION"
                        ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        intent === "SEEKING_SOLUTION"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900">I need something</p>
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                          Seek Solutions
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Find developers, funding, specialized partners, or commercial solutions for your problem or idea.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntent("OFFERING_SOLUTION")}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      intent === "OFFERING_SOLUTION"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        intent === "OFFERING_SOLUTION"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Rocket className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900">I can offer something</p>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                          Share Skills & Ideas
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Share your technical skills, commercial services, product ideas, startup capabilities, or resources.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* CATEGORY SELECTOR */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Select Opportunity Category:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "FINTECH", label: "Fintech", icon: CreditCard, color: "text-blue-600" },
                    { key: "TECH", label: "Tech", icon: Code2, color: "text-indigo-600" },
                    { key: "BUSINESS", label: "Business", icon: Briefcase, color: "text-emerald-600" },
                    { key: "LOCAL", label: "Local", icon: MapPin, color: "text-amber-600" },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setCategory(cat.key as OpportunityCategory)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? "text-indigo-600" : cat.color}`} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* IDEA VS PROBLEM FORMAT */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Submission Format:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmissionType("IDEA")}
                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition ${
                      submissionType === "IDEA"
                        ? "border-indigo-500 bg-indigo-50/40 text-slate-900 ring-1 ring-indigo-400"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-bold">I have an Idea</p>
                      <p className="text-[11px] text-slate-500">Solution, innovation, or capability you want to develop</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionType("PROBLEM")}
                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition ${
                      submissionType === "PROBLEM"
                        ? "border-indigo-500 bg-indigo-50/40 text-slate-900 ring-1 ring-indigo-400"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <div>
                      <p className="text-xs font-bold">I have a Problem</p>
                      <p className="text-[11px] text-slate-500">Inefficiency, friction, or challenge needing a solution</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* DESCRIPTION TEXT */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="opp-desc" className="text-sm font-semibold text-slate-900">
                    Describe your {intent === "SEEKING_SOLUTION" ? "request / problem" : "offering / idea"} in plain language:
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
                  <span>Two-Sided Network Guarantees</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Your drafts remain private until you explicitly approve publishing.</li>
                  <li>You can seek solutions for one project and offer capabilities for another freely.</li>
                  <li>AI structures hypotheses for review without inventing fake metrics or phantom investors.</li>
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

              {/* Intent & Category Review Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Network Intent</label>
                  <div className="flex rounded-lg border border-slate-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setIntent("SEEKING_SOLUTION")}
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                        intent === "SEEKING_SOLUTION"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Seeking Solution
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntent("OFFERING_SOLUTION")}
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                        intent === "OFFERING_SOLUTION"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Offering Solution
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-300 bg-white p-1 text-center">
                    {(["FINTECH", "TECH", "BUSINESS", "LOCAL"] as OpportunityCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`rounded-md py-1.5 text-[11px] font-bold transition ${
                          category === cat
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
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
                    <span className="text-[11px] font-semibold text-slate-500">Format</span>
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
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      {targetCustomerSegments.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No segments identified</span>
                      ) : (
                        targetCustomerSegments.map((segment, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                          >
                            <span>{segment}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(idx, targetCustomerSegments, setTargetCustomerSegments)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSegment}
                        onChange={(e) => setNewSegment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag(
                              newSegment,
                              targetCustomerSegments,
                              setTargetCustomerSegments,
                              setNewSegment,
                              "target_customer_segments"
                            );
                          }
                        }}
                        placeholder="Add candidate segment..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTag(
                            newSegment,
                            targetCustomerSegments,
                            setTargetCustomerSegments,
                            setNewSegment,
                            "target_customer_segments"
                          )
                        }
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      {customerPainPoints.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No pain points identified</span>
                      ) : (
                        customerPainPoints.map((pain, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                          >
                            <span>{pain}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(idx, customerPainPoints, setCustomerPainPoints)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPainPoint}
                        onChange={(e) => setNewPainPoint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag(
                              newPainPoint,
                              customerPainPoints,
                              setCustomerPainPoints,
                              setNewPainPoint,
                              "customer_pain_points"
                            );
                          }
                        }}
                        placeholder="Add pain point..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTag(
                            newPainPoint,
                            customerPainPoints,
                            setCustomerPainPoints,
                            setNewPainPoint,
                            "customer_pain_points"
                          )
                        }
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills and Business Models Lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Required Skills & Resources</label>
                    {getProvenanceBadge("required_skills_and_resources")}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      {requiredSkills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No required capabilities specified</span>
                      ) : (
                        requiredSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(idx, requiredSkills, setRequiredSkills)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag(
                              newSkill,
                              requiredSkills,
                              setRequiredSkills,
                              setNewSkill,
                              "required_skills_and_resources"
                            );
                          }
                        }}
                        placeholder="Add required skill or asset..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTag(
                            newSkill,
                            requiredSkills,
                            setRequiredSkills,
                            setNewSkill,
                            "required_skills_and_resources"
                          )
                        }
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      {businessModels.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No business models identified</span>
                      ) : (
                        businessModels.map((model, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                          >
                            <span>{model}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(idx, businessModels, setBusinessModels)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag(
                              newModel,
                              businessModels,
                              setBusinessModels,
                              setNewModel,
                              "potential_business_models"
                            );
                          }
                        }}
                        placeholder="Add monetization approach..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTag(
                            newModel,
                            businessModels,
                            setBusinessModels,
                            setNewModel,
                            "potential_business_models"
                          )
                        }
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assumptions & Risks Accordion / Section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Unverified Assumptions (Validate with market data)
                    </label>
                    {getProvenanceBadge("key_assumptions")}
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    {keyAssumptions.length === 0 ? (
                      <li className="italic text-slate-400 list-none">No assumptions extracted.</li>
                    ) : (
                      keyAssumptions.map((item, i) => <li key={i}>{item}</li>)
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Execution Risks & Uncertainties
                    </label>
                    {getProvenanceBadge("risks_and_uncertainties")}
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    {risks.length === 0 ? (
                      <li className="italic text-slate-400 list-none">No risks identified.</li>
                    ) : (
                      risks.map((item, i) => <li key={i}>{item}</li>)
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Missing Information & Context Needed
                    </label>
                    {getProvenanceBadge("missing_information")}
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    {missingInfo.length === 0 ? (
                      <li className="italic text-slate-400 list-none">No critical information gaps identified.</li>
                    ) : (
                      missingInfo.map((item, i) => <li key={i}>{item}</li>)
                    )}
                  </ul>
                </div>

                {followUpQuestions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-indigo-900">
                        Suggested Deepening Questions
                      </label>
                      {getProvenanceBadge("suggested_follow_up_questions")}
                    </div>
                    <ul className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                      {followUpQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
                disabled={isAnalyzing || descriptionInput.trim().length < 10}
                className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
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
