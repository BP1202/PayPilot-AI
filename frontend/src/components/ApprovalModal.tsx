"use client";

import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { RecommendedAction, Transaction } from "@/types";
import { approvePayment } from "@/lib/api";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: RecommendedAction | null;
  onSuccess: (captured: Transaction) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  action,
  onSuccess,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !action) return null;

  const handleApprove = async () => {
    if (!confirmed || !action.transaction_ref) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const result = await approvePayment({
        transaction_ref: action.transaction_ref,
        owner_approved: true,
        idempotency_key: idempotencyKey,
      });

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to execute payment approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Owner Payment Authorization
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic security boundary — explicit confirmation required
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5 space-y-2 text-sm text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Action:</span>
            <span className="font-semibold text-slate-900">{action.action_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Transaction Reference:</span>
            <span className="font-mono text-xs font-semibold text-indigo-700">
              {action.transaction_ref}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-medium text-slate-900">{action.customer_name || "Client"}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Capture Amount:</span>
            <span className="text-emerald-700">
              ${parseFloat(action.amount || "0").toFixed(2)} {action.currency}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>Payment Provider:</span>
            <span className="font-medium text-slate-700">PayPal Simulated Checkout</span>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Security Notice:</strong> PayPilot AI never executes payments automatically.
          Funds will be captured via the simulated PayPal provider only upon your explicit confirmation below.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <label className="flex items-start space-x-3 cursor-pointer select-none mb-6">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            I confirm that I have reviewed the recommendation and <strong>explicitly authorize</strong> capturing{" "}
            <strong>${parseFloat(action.amount || "0").toFixed(2)} {action.currency}</strong> for transaction{" "}
            <code className="text-indigo-600 font-mono">{action.transaction_ref}</code>.
          </span>
        </label>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={!confirmed || isSubmitting}
            className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all ${
              confirmed && !isSubmitting
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 cursor-pointer"
                : "bg-slate-300 cursor-not-allowed shadow-none"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Capturing Payment...</span>
              </>
            ) : (
              <>
                <span>Authorize & Capture</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

