import {
  ApprovePaymentRequest,
  Business,
  BusinessCreatePayload,
  BusinessProfileExtraction,
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

export function getAuthHeaders(): Record<string, string> {
  const storedUser = typeof window !== "undefined" ? localStorage.getItem("paypilot_user_id") : null;
  return {
    "Content-Type": "application/json",
    ...(storedUser ? { "X-User-ID": storedUser } : { "X-User-ID": "owner_default" }),
  };
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
        const rawDetail = (data as { detail?: unknown }).detail;
        if (typeof rawDetail === "string") {
          detail = rawDetail;
        } else if (Array.isArray(rawDetail)) {
          detail = rawDetail
            .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : ""))
            .filter(Boolean)
            .join("; ");
        }
      }
    } catch {
      // response body was not JSON
    }

    if (detail && !isTechnicalDetail(detail)) {
      throw new ApiError(detail, res.status, data);
    }

    throw new ApiError(fallbackMessage, res.status, data);
  }

  return res.json() as Promise<T>;
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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

export async function extractBusinessProfile(
  description: string
): Promise<BusinessProfileExtraction> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/business/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description }),
    });
    return await handleResponse<BusinessProfileExtraction>(
      res,
      "We couldn't analyze the business description right now. Please enter the details manually."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't analyze the business description right now. Please enter the details manually."
    );
  }
}

export async function createBusinessProfile(
  payload: BusinessCreatePayload
): Promise<Business> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/business`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await handleResponse<Business>(
      res,
      "Unable to save your business profile right now. Please check your information and try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to save your business profile right now. Please check your information and try again."
    );
  }
}

export async function fetchMyBusiness(): Promise<Business> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/business/me`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<Business>(
      res,
      "We couldn't retrieve your business profile right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't retrieve your business profile right now. Please try again."
    );
  }
}
