import {
  ApprovePaymentRequest,
  CopilotChatResponse,
  CopilotRecommendation,
  DashboardOverview,
  LedgerListResponse,
  Transaction,
  TransactionStatus,
} from "@/types";

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000/api/v1";
}

const FRIENDLY_CONNECTION_ERROR =
  "We're having trouble connecting to your financial records right now. Please check your internet connection or try again.";

const FRIENDLY_GENERIC_ERROR =
  "We couldn't retrieve your financial information right now. Please try again in a moment.";

function isTechnicalDetail(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("exception") ||
    lower.includes("traceback") ||
    lower.includes("sql") ||
    lower.includes("database") ||
    lower.includes("connection to server") ||
    lower.includes("internal server error") ||
    lower.includes("undefinedtable") ||
    lower.includes("http") ||
    lower.includes("api") ||
    lower.includes("psycopg")
  );
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let detail = "";
    let data: unknown = null;
    try {
      data = await res.json();
      if (typeof data === "object" && data !== null) {
        const rawDetail =
          (data as { detail?: string }).detail ||
          (data as { message?: string }).message ||
          "";
        if (rawDetail && !isTechnicalDetail(rawDetail)) {
          detail = rawDetail;
        }
      }
    } catch {
      // Non-JSON response
    }

    const message = detail || fallbackMessage;
    throw new ApiError(message, res.status, data);
  }
  return res.json();
}

function handleFetchError(err: unknown, userFriendlyFallback: string): never {
  if (err instanceof ApiError) {
    throw err;
  }
  throw new ApiError(userFriendlyFallback || FRIENDLY_CONNECTION_ERROR, 0);
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/dashboard/overview`, {
      cache: "no-store",
    });
    return await handleResponse<DashboardOverview>(res, FRIENDLY_GENERIC_ERROR);
  } catch (err) {
    handleFetchError(err, FRIENDLY_CONNECTION_ERROR);
  }
}

export async function fetchLedgerTransactions(
  status?: TransactionStatus
): Promise<LedgerListResponse> {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`${getApiBaseUrl()}/ledger${query}`, {
      cache: "no-store",
    });
    return await handleResponse<LedgerListResponse>(
      res,
      "We couldn't load your transaction records right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't load your transaction records right now. Please try again."
    );
  }
}

export async function fetchCopilotRecommendation(): Promise<CopilotRecommendation> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/copilot/recommendation`, {
      cache: "no-store",
    });
    return await handleResponse<CopilotRecommendation>(
      res,
      "We couldn't retrieve the latest financial recommendation right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't retrieve the latest financial recommendation right now. Please try again."
    );
  }
}

export async function sendCopilotChat(prompt: string): Promise<CopilotChatResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/copilot/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    return await handleResponse<CopilotChatResponse>(
      res,
      "I'm temporarily unable to answer right now. Please try asking again in a moment."
    );
  } catch (err) {
    handleFetchError(
      err,
      "I'm temporarily unable to answer right now. Please try asking again in a moment."
    );
  }
}

export async function approvePayment(
  data: ApprovePaymentRequest
): Promise<Transaction> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/payments/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await handleResponse<Transaction>(
      res,
      "Unable to complete payment authorization right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to complete payment authorization right now. Please try again."
    );
  }
}
