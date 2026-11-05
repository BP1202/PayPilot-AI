"use client";

import React, { useState } from "react";
import { UserPlus, X, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Connection, ConnectionIntent, ConnectionCreatePayload } from "@/types";
import { sendConnectionRequest } from "@/lib/api";

const INTENT_LABELS: Record<ConnectionIntent, string> = {
  EXPLORE_COLLABORATION: "Explore Collaboration",
  OFFER_CAPABILITY: "Offer a Capability",
  SEEK_ASSISTANCE: "Seek Assistance",
  CO_FOUNDER: "Co-Founder Opportunity",
  PARTNERSHIP: "Strategic Partnership",
};

const INTENT_VALUES = Object.keys(INTENT_LABELS) as ConnectionIntent[];

interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUserId: string;
  recipientName?: string | null;
  opportunityId?: string | null;
  opportunityTitle?: string | null;
  onSuccess?: (connection: Connection) => void;
}

export const ConnectionRequestModal: React.FC<ConnectionRequestModalProps> = ({
  isOpen,
  onClose,
  recipientUserId,
  recipientName,
  opportunityId,
  opportunityTitle,
  onSuccess,
}) => {
  const [intent, setIntent] = useState<ConnectionIntent>("EXPLORE_COLLABORATION");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setIntent("EXPLORE_COLLABORATION");
    setMessage("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Please write at least 10 characters in your message.");
      return;
    }
    if (message.trim().length > 1000) {
      setError("Message must be 1000 characters or fewer.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: ConnectionCreatePayload = {
      recipient_id: recipientUserId,
      intent,
      message: message.trim(),
      opportunity_id: opportunityId ?? null,
    };

    try {
      const connection = await sendConnectionRequest(payload);
      setSuccess(true);
      if (onSuccess) onSuccess(connection);
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="connection-request-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Send Connection Request
              </h2>
              {recipientName && (
                <p className="text-xs text-slate-500">
                  To: <span className="font-semibold text-indigo-700">{recipientName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Opportunity context chip */}
        {opportunityTitle && (
          <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/60">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-700">
              Opportunity: {opportunityTitle}
            </span>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {success ? (
            <div
              data-testid="connection-success"
              className="flex flex-col items-center justify-center py-8 space-y-3 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Request Sent!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Your connection request has been delivered.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Intent selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="conn-intent"
                  className="text-xs font-bold text-slate-700"
                >
                  Collaboration Intent
                </label>
                <select
                  id="conn-intent"
                  data-testid="intent-select"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value as ConnectionIntent)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 cursor-pointer"
                >
                  {INTENT_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {INTENT_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label
                  htmlFor="conn-message"
                  className="text-xs font-bold text-slate-700"
                >
                  Message{" "}
                  <span className="text-slate-400 font-normal">(10–1000 characters)</span>
                </label>
                <textarea
                  id="conn-message"
                  data-testid="message-textarea"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  rows={4}
                  placeholder="Introduce yourself and explain why you'd like to connect..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none disabled:opacity-50"
                />
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] font-medium ${
                      message.length > 1000
                        ? "text-red-500"
                        : message.length >= 10
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {message.length} / 1000
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  data-testid="connection-error"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
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
                  disabled={loading || message.trim().length < 10}
                  data-testid="submit-connection"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
