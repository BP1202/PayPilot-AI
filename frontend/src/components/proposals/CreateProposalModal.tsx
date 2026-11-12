"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Connection,
  Proposal,
  ProposalCreatePayload,
  ProposalMilestoneItem,
  User,
} from "@/types";
import { createProposal } from "@/lib/api";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "SGD", "INR"];
const BUDGET_REGEX = /^\d+(\.\d{1,2})?$/;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection;
  currentUser: User;
  onSuccess?: (proposal: Proposal) => void;
}

type SectionId = "basics" | "scope" | "financials" | "milestones" | "governance";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "basics", label: "1. Basics" },
  { id: "scope", label: "2. Scope" },
  { id: "financials", label: "3. Financials" },
  { id: "milestones", label: "4. Milestones" },
  { id: "governance", label: "5. Governance" },
];

type MilestoneRow = { id: string; title: string; description: string; amount: string; target_date: string };
type ResponsibilityRow = { id: string; key: string; value: string };

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  onClose,
  connection,
  currentUser,
  onSuccess,
}) => {
  const isRequester = connection.requester.user_id === currentUser.id;
  const counterpart = isRequester ? connection.recipient : connection.requester;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timelineSummary, setTimelineSummary] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [responsibilities, setResponsibilities] = useState<ResponsibilityRow[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([""]);
  const [conditions, setConditions] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");

  // UI state
  const [openSection, setOpenSection] = useState<SectionId>("basics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // Deliverables helpers
  const addDeliverable = () => setDeliverables((d) => [...d, ""]);
  const updateDeliverable = (idx: number, val: string) =>
    setDeliverables((d) => d.map((x, i) => (i === idx ? val : x)));
  const removeDeliverable = (idx: number) =>
    setDeliverables((d) => d.filter((_, i) => i !== idx));

  // Milestones helpers
  const addMilestone = () =>
    setMilestones((m) => [
      ...m,
      { id: generateId(), title: "", description: "", amount: "", target_date: "" },
    ]);
  const updateMilestone = (id: string, field: keyof MilestoneRow, val: string) =>
    setMilestones((m) => m.map((ms) => (ms.id === id ? { ...ms, [field]: val } : ms)));
  const removeMilestone = (id: string) =>
    setMilestones((m) => m.filter((ms) => ms.id !== id));

  // Responsibilities helpers
  const addResponsibility = () =>
    setResponsibilities((r) => [...r, { id: generateId(), key: "", value: "" }]);
  const updateResponsibility = (id: string, field: "key" | "value", val: string) =>
    setResponsibilities((r) =>
      r.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  const removeResponsibility = (id: string) =>
    setResponsibilities((r) => r.filter((item) => item.id !== id));

  // List helpers
  const addAssumption = () => setAssumptions((a) => [...a, ""]);
  const updateAssumption = (idx: number, val: string) =>
    setAssumptions((a) => a.map((x, i) => (i === idx ? val : x)));
  const removeAssumption = (idx: number) =>
    setAssumptions((a) => a.filter((_, i) => i !== idx));

  const addCondition = () => setConditions((c) => [...c, ""]);
  const updateCondition = (idx: number, val: string) =>
    setConditions((c) => c.map((x, i) => (i === idx ? val : x)));
  const removeCondition = (idx: number) =>
    setConditions((c) => c.filter((_, i) => i !== idx));

  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (!description.trim()) return "Description is required.";
    if (budgetAmount && !BUDGET_REGEX.test(budgetAmount.trim())) {
      return "Budget must be a valid number (e.g. 1500 or 1500.00).";
    }
    if (!/^[A-Z]{3}$/.test(currency)) return "Currency must be exactly 3 uppercase letters.";
    if (durationDays && (isNaN(Number(durationDays)) || Number(durationDays) <= 0)) {
      return "Estimated duration must be a positive number.";
    }
    for (const ms of milestones) {
      if (ms.amount && !BUDGET_REGEX.test(ms.amount.trim())) {
        return `Milestone "${ms.title || "unnamed"}" has an invalid amount.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);
    setError(null);

    const milestoneItems: ProposalMilestoneItem[] = milestones.map((ms) => ({
      id: ms.id,
      title: ms.title,
      description: ms.description || null,
      amount: ms.amount || "0",
      target_date: ms.target_date || null,
    }));

    const responsibilitiesMap: Record<string, string> = {};
    for (const r of responsibilities) {
      if (r.key.trim()) responsibilitiesMap[r.key.trim()] = r.value.trim();
    }

    const payload: ProposalCreatePayload = {
      connection_id: connection.id,
      opportunity_id: connection.opportunity_id ?? null,
      title: title.trim(),
      description: description.trim(),
      scope_of_work: scopeOfWork.trim() || null,
      deliverables: deliverables.map((d) => d.trim()).filter(Boolean),
      budget_amount: budgetAmount.trim() || null,
      currency,
      timeline_summary: timelineSummary.trim() || null,
      estimated_duration_days: durationDays ? parseInt(durationDays, 10) : null,
      milestones: milestoneItems,
      responsibilities: responsibilitiesMap,
      assumptions: assumptions.map((a) => a.trim()).filter(Boolean),
      conditions: conditions.map((c) => c.trim()).filter(Boolean),
      notes: notes.trim() || null,
    };

    try {
      const proposal = await createProposal(payload);
      setSuccess(true);
      if (onSuccess) onSuccess(proposal);
      setTimeout(() => onClose(), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create proposal.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: SectionId) =>
    setOpenSection((cur) => (cur === id ? id : id));

  return (
    <div
      data-testid="create-proposal-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create Proposal</h2>
              <p className="text-xs text-slate-500">
                To:{" "}
                <span className="font-semibold text-indigo-700">
                  {counterpart.full_name ?? "Unknown"}
                </span>
                {connection.opportunity_title && (
                  <> · Re: {connection.opportunity_title}</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Proposal Created!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Your proposal has been submitted to {counterpart.full_name ?? "the recipient"}.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{error}</p>
                </div>
              )}

              {/* Section Nav */}
              <div className="flex gap-1 flex-wrap">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setOpenSection(s.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      openSection === s.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* === BASICS === */}
              {openSection === "basics" && (
                <div className="space-y-4">
                  <Field label="Title" required>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Proposal title"
                      disabled={loading}
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Description" required>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the proposal..."
                      rows={4}
                      disabled={loading}
                      className={TEXTAREA_CLS}
                    />
                  </Field>
                </div>
              )}

              {/* === SCOPE === */}
              {openSection === "scope" && (
                <div className="space-y-4">
                  <Field label="Scope of Work">
                    <textarea
                      value={scopeOfWork}
                      onChange={(e) => setScopeOfWork(e.target.value)}
                      placeholder="Describe the full scope of work..."
                      rows={4}
                      disabled={loading}
                      className={TEXTAREA_CLS}
                    />
                  </Field>
                  <Field label="Deliverables">
                    <div className="space-y-2">
                      {deliverables.map((d, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={d}
                            onChange={(e) => updateDeliverable(idx, e.target.value)}
                            placeholder={`Deliverable ${idx + 1}`}
                            disabled={loading}
                            className={INPUT_CLS}
                          />
                          {deliverables.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDeliverable(idx)}
                              className="shrink-0 p-1 text-red-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addDeliverable}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Deliverable
                      </button>
                    </div>
                  </Field>
                </div>
              )}

              {/* === FINANCIALS === */}
              {openSection === "financials" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Budget Amount">
                      <input
                        type="text"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="e.g. 5000.00"
                        disabled={loading}
                        className={INPUT_CLS}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Enter as a numeric string (e.g. 1500 or 1500.00)
                      </p>
                    </Field>
                    <Field label="Currency">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={loading}
                        className={INPUT_CLS + " cursor-pointer"}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Timeline Summary">
                    <input
                      type="text"
                      value={timelineSummary}
                      onChange={(e) => setTimelineSummary(e.target.value)}
                      placeholder="e.g. 3-month engagement starting Q1 2027"
                      disabled={loading}
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Estimated Duration (days)">
                    <input
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      placeholder="e.g. 90"
                      min={1}
                      disabled={loading}
                      className={INPUT_CLS}
                    />
                  </Field>
                </div>
              )}

              {/* === MILESTONES === */}
              {openSection === "milestones" && (
                <div className="space-y-3">
                  {milestones.length === 0 && (
                    <p className="text-xs text-slate-400">
                      No milestones added yet. Add milestones to structure delivery.
                    </p>
                  )}
                  {milestones.map((ms) => (
                    <div
                      key={ms.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">Milestone</span>
                        <button
                          type="button"
                          onClick={() => removeMilestone(ms.id)}
                          className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={ms.title}
                        onChange={(e) => updateMilestone(ms.id, "title", e.target.value)}
                        placeholder="Milestone title"
                        disabled={loading}
                        className={INPUT_CLS}
                      />
                      <input
                        type="text"
                        value={ms.description}
                        onChange={(e) => updateMilestone(ms.id, "description", e.target.value)}
                        placeholder="Description (optional)"
                        disabled={loading}
                        className={INPUT_CLS}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={ms.amount}
                          onChange={(e) => updateMilestone(ms.id, "amount", e.target.value)}
                          placeholder="Amount (e.g. 500.00)"
                          disabled={loading}
                          className={INPUT_CLS}
                        />
                        <input
                          type="date"
                          value={ms.target_date}
                          onChange={(e) => updateMilestone(ms.id, "target_date", e.target.value)}
                          disabled={loading}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Milestone
                  </button>
                </div>
              )}

              {/* === GOVERNANCE === */}
              {openSection === "governance" && (
                <div className="space-y-4">
                  <Field label="Responsibilities">
                    <div className="space-y-2">
                      {responsibilities.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={r.key}
                            onChange={(e) => updateResponsibility(r.id, "key", e.target.value)}
                            placeholder="Who"
                            disabled={loading}
                            className={INPUT_CLS + " w-1/3"}
                          />
                          <input
                            type="text"
                            value={r.value}
                            onChange={(e) =>
                              updateResponsibility(r.id, "value", e.target.value)
                            }
                            placeholder="Does what"
                            disabled={loading}
                            className={INPUT_CLS + " flex-1"}
                          />
                          <button
                            type="button"
                            onClick={() => removeResponsibility(r.id)}
                            className="shrink-0 p-1 text-red-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addResponsibility}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Responsibility
                      </button>
                    </div>
                  </Field>

                  <Field label="Assumptions">
                    <div className="space-y-2">
                      {assumptions.map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={a}
                            onChange={(e) => updateAssumption(idx, e.target.value)}
                            placeholder={`Assumption ${idx + 1}`}
                            disabled={loading}
                            className={INPUT_CLS}
                          />
                          {assumptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAssumption(idx)}
                              className="shrink-0 p-1 text-red-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addAssumption}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Assumption
                      </button>
                    </div>
                  </Field>

                  <Field label="Conditions">
                    <div className="space-y-2">
                      {conditions.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={c}
                            onChange={(e) => updateCondition(idx, e.target.value)}
                            placeholder={`Condition ${idx + 1}`}
                            disabled={loading}
                            className={INPUT_CLS}
                          />
                          {conditions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCondition(idx)}
                              className="shrink-0 p-1 text-red-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addCondition}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Condition
                      </button>
                    </div>
                  </Field>

                  <Field label="Notes">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes..."
                      rows={3}
                      disabled={loading}
                      className={TEXTAREA_CLS}
                    />
                  </Field>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  data-testid="submit-proposal"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Proposal"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50";

const TEXTAREA_CLS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none disabled:opacity-50";
