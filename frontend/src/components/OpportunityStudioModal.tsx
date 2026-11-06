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
  Globe,
  Lock,
  Eye,
  Archive,
  Ban,
  Users,
  ArrowLeft,
  Check,
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
  ApiError,
  analyzeOpportunity,
  createOpportunity,
  updateOpportunity,
  reanalyzeOpportunity,
  publishOpportunity,
  unpublishOpportunity,
  closeOpportunity,
  updateOpportunityVisibility,
} from "@/lib/api";

interface OpportunityStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (opportunity: Opportunity, message: string) => void;
  existingOpportunity?: Opportunity | null;
  businessId?: number | null;
  initialIntent?: OpportunityIntent;
  initialCategory?: OpportunityCategory;
  onFindCollaborators?: (opp: Opportunity) => void;
}

export const OpportunityStudioModal: React.FC<OpportunityStudioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingOpportunity,
  businessId,
  initialIntent,
  initialCategory,
  onFindCollaborators,
}) => {
  // Step 1: Capture (input & type), Step 2: Understand & Review
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [submissionType, setSubmissionType] = useState<OpportunityType>("IDEA");
  const [intent, setIntent] = useState<OpportunityIntent>(initialIntent || "SEEKING_SOLUTION");
  const [category, setCategory] = useState<OpportunityCategory>(initialCategory || "BUSINESS");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [oppStatus, setOppStatus] = useState<OpportunityStatus>("DRAFT");
  const [visibility, setVisibility] = useState<OpportunityVisibility>("PRIVATE");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
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
      setOppStatus(existingOpportunity.status || "DRAFT");
      setVisibility(existingOpportunity.visibility || "PRIVATE");
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
      setOppStatus("DRAFT");
      setVisibility("PRIVATE");
      setValidationErrors([]);
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
          status: oppStatus === "CLOSED" ? ("CLOSED" as OpportunityStatus) : oppStatus === "PUBLISHED" ? ("PUBLISHED" as OpportunityStatus) : ("ANALYSED" as OpportunityStatus),
          visibility: visibility as OpportunityVisibility,
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

  const handlePublish = async () => {
    setValidationErrors([]);
    setErrorMessage(null);

    const errs: string[] = [];
    if (title.trim().length < 5) {
      errs.push("Title must be at least 5 characters long.");
    }
    if (!industry.trim() || industry.trim().length < 2) {
      errs.push("Opportunity must belong to a specific industry.");
    }
    const substance = [proposedSolution.trim(), problemStatement.trim(), descriptionInput.trim()].join(" ");
    if (substance.trim().length < 10) {
      errs.push("Opportunity must provide substantial description or solution details (at least 10 characters).");
    }
    if (targetCustomerSegments.length === 0 && requiredSkills.length === 0 && !valueProposition.trim()) {
      errs.push("Must define at least one target segment, required skill, or value proposition.");
    }
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }

    try {
      setIsPublishing(true);
      let oppId = existingOpportunity?.id;

      if (!oppId) {
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
          status: "DRAFT" as OpportunityStatus,
          visibility: visibility || "PRIVATE",
        });
        oppId = created.id;
      } else {
        await updateOpportunity(oppId, {
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
        });
      }

      const published = await publishOpportunity(oppId, {
        visibility: visibility === "PRIVATE" ? "PUBLIC" : visibility,
      });

      setOppStatus("PUBLISHED");
      setVisibility(published.visibility);
      onSuccess(published, `Opportunity "${published.title}" is now published (${published.visibility})!`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish opportunity.";
      const errorData = err instanceof ApiError ? (err.data as Record<string, any> | undefined) : undefined;
      if (errorData && errorData.detail) {
        const detail = errorData.detail;
        if (Array.isArray(detail)) {
          setValidationErrors(detail.map((d: any) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))));
        } else if (typeof detail === "string") {
          setValidationErrors([detail]);
        } else {
          setErrorMessage(msg);
        }
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!existingOpportunity) return;
    try {
      setIsUnpublishing(true);
      setErrorMessage(null);
      const unpublished = await unpublishOpportunity(existingOpportunity.id);
      setOppStatus("DRAFT");
      setVisibility("PRIVATE");
      onSuccess(unpublished, `Opportunity "${unpublished.title}" has been unpublished and returned to private drafts.`);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to unpublish opportunity.");
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleCloseOpportunity = async () => {
    if (!existingOpportunity) return;
    try {
      setIsClosing(true);
      setErrorMessage(null);
      const closed = await closeOpportunity(existingOpportunity.id);
      setOppStatus("CLOSED");
      onSuccess(closed, `Opportunity "${closed.title}" is now closed.`);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to close opportunity.");
    } finally {
      setIsClosing(false);
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
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 w-screen h-screen overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-title"
    >
      {/* Full View Studio Header */}
      <header className="shrink-0 z-20 border-b border-slate-200/90 bg-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${
                intent === "SEEKING_SOLUTION"
                  ? "bg-blue-600 shadow-blue-200"
                  : "bg-emerald-600 shadow-emerald-200"
              }`}
            >
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="studio-title" className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  {existingOpportunity ? "Edit Opportunity Draft" : "Idea Capture & Opportunity Studio"}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                    intent === "SEEKING_SOLUTION"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {intent === "SEEKING_SOLUTION" ? "Seek Solutions" : "Share Skills & Ideas"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                  Full View Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Structure your needs or offerings into a validated commercial opportunity.
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Step Indicator & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => step === "review" && setStep("capture")}
              className={`px-2.5 py-1 rounded-lg transition ${
                step === "capture"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 cursor-pointer"
              }`}
            >
              1. Capture & Intent
            </button>
            <span className="text-slate-300">/</span>
            <span
              className={`px-2.5 py-1 rounded-lg transition ${
                step === "review"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500"
              }`}
            >
              2. AI Business Structure
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Full View Studio Canvas */}
      <main className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
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
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                      intent === "SEEKING_SOLUTION"
                        ? "border-blue-500 bg-blue-50/80 shadow-xs ring-2 ring-blue-500"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        intent === "SEEKING_SOLUTION"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">I need something</p>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                          Seek Solutions · Blue
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Find developers, funding, specialized partners, or commercial solutions for your problem or idea.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntent("OFFERING_SOLUTION")}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                      intent === "OFFERING_SOLUTION"
                        ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        intent === "OFFERING_SOLUTION"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">I can offer something</p>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          Share Skills & Ideas · Green
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
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

              {/* Lifecycle Status & Visibility Controls */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Lifecycle Status:</span>
                    <span
                      data-testid="lifecycle-status-badge"
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                        oppStatus === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : oppStatus === "CLOSED"
                          ? "bg-slate-100 text-slate-700 border border-slate-300"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {oppStatus === "PUBLISHED" ? (
                        <Globe className="h-3.5 w-3.5" />
                      ) : oppStatus === "CLOSED" ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      <span>{oppStatus === "PUBLISHED" ? "PUBLISHED" : oppStatus === "CLOSED" ? "CLOSED" : "DRAFT"}</span>
                    </span>
                  </div>

                  {oppStatus !== "CLOSED" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Visibility:</span>
                      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setVisibility("PRIVATE")}
                          className={`rounded-md px-2 py-0.5 font-bold transition cursor-pointer ${
                            visibility === "PRIVATE"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Private
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibility("AUTHENTICATED")}
                          className={`rounded-md px-2 py-0.5 font-bold transition cursor-pointer ${
                            visibility === "AUTHENTICATED"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Members Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibility("PUBLIC")}
                          className={`rounded-md px-2 py-0.5 font-bold transition cursor-pointer ${
                            visibility === "PUBLIC"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Public
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {oppStatus === "CLOSED" && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>This opportunity is closed. Historical records are preserved, but it cannot be republished.</span>
                  </div>
                )}

                {validationErrors.length > 0 && (
                  <div
                    data-testid="validation-errors-box"
                    className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Required for Network Publication:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-rose-700">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
      </main>

      {/* FULL VIEW STUDIO FOOTER BAR */}
      <footer className="shrink-0 z-20 border-t border-slate-200/90 bg-white px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {step === "capture" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || descriptionInput.trim().length < 10}
                className={`flex items-center space-x-2 rounded-xl px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md disabled:opacity-50 transition cursor-pointer ${
                  intent === "SEEKING_SOLUTION"
                    ? "bg-blue-600 shadow-blue-200 hover:bg-blue-700"
                    : "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
                }`}
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
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Back to Text
                </button>
                <button
                  type="button"
                  onClick={handleReanalyze}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>Re-analyze</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                {oppStatus === "PUBLISHED" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUnpublish}
                      disabled={isUnpublishing}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
                    >
                      {isUnpublishing ? "Unpublishing..." : "Unpublish to Draft"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseOpportunity}
                      disabled={isClosing}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition cursor-pointer disabled:opacity-50"
                    >
                      {isClosing ? "Closing..." : "Close Opportunity"}
                    </button>
                    {onFindCollaborators && existingOpportunity && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onFindCollaborators(existingOpportunity);
                        }}
                        className="flex items-center space-x-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Find Collaborators</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSaving || !title.trim()}
                      className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Save Changes</span>
                    </button>
                  </>
                ) : oppStatus === "CLOSED" ? (
                  <span className="text-xs font-bold text-slate-500 py-2 px-3 bg-slate-100 rounded-xl">
                    Opportunity Closed
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSaving || !title.trim()}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Opportunity Draft"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isPublishing || !title.trim()}
                      className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-3.5 w-3.5" />
                          <span>Publish Opportunity</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
