import {
  ApprovePaymentRequest,
  CopilotChatResponse,
  CopilotRecommendation,
  DashboardOverview,
  LedgerListResponse,
  Transaction,
  TransactionStatus,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE_URL}/dashboard/overview`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard overview: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchLedgerTransactions(
  status?: TransactionStatus
): Promise<LedgerListResponse> {
  const url = new URL(`${API_BASE_URL}/ledger`);
  if (status) {
    url.searchParams.set("status", status);
  }
  const res = await fetch(url.toString(), {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ledger: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCopilotRecommendation(): Promise<CopilotRecommendation> {
  const res = await fetch(`${API_BASE_URL}/copilot/recommendation`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch copilot recommendation: ${res.statusText}`);
  }
  return res.json();
}

export async function sendCopilotChat(prompt: string): Promise<CopilotChatResponse> {
  const res = await fetch(`${API_BASE_URL}/copilot/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    throw new Error(`Failed to chat with copilot: ${res.statusText}`);
  }
  return res.json();
}

export async function approvePayment(
  data: ApprovePaymentRequest
): Promise<Transaction> {
  const res = await fetch(`${API_BASE_URL}/payments/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Payment approval failed: ${res.statusText}`);
  }
  return res.json();
}
