import {
  ApprovePaymentRequest,
  Business,
  BusinessCreatePayload,
  BusinessProfileExtraction,
  BusinessProfileUpdatePayload,
  IndividualProfile,
  IndividualProfileUpdatePayload,
  ProfileMeResponse,
  CopilotChatResponse,
  CopilotRecommendation,
  DashboardOverview,
  LedgerListResponse,
  LoginPayload,
  Opportunity,
  OpportunityAnalyzeResponse,
  OpportunityCategory,
  OpportunityIntent,
  OpportunityCreatePayload,
  OpportunityListResponse,
  OpportunityStatus,
  OpportunityType,
  OpportunityUpdatePayload,
  OpportunityVisibility,
  OpportunityPublishPayload,
  OpportunityClosePayload,
  OpportunityVisibilityUpdatePayload,
  RegisterPayload,
  TokenResponse,
  Transaction,
  TransactionStatus,
  User,
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

// ---------------------------------------------------------------------------
// Cryptographic Token and Verified Session Management
// ---------------------------------------------------------------------------

export const AUTH_STORAGE_KEY = "paypilot_access_token";
export const USER_STORAGE_KEY = "paypilot_user_profile";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, token);
  window.dispatchEvent(new Event("paypilot:auth_changed"));
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  window.dispatchEvent(new Event("paypilot:auth_changed"));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("paypilot:auth_changed"));
}

/**
 * Builds standard HTTP headers for API requests.
 * Uses cryptographically verified Bearer token; never sends unverified client headers.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    if (res.status === 401) {
      clearAccessToken();
    }

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

// ---------------------------------------------------------------------------
// Authentication API Methods
// ---------------------------------------------------------------------------

export async function registerUser(payload: RegisterPayload): Promise<TokenResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<TokenResponse>(
      res,
      "Registration failed. Please check your information and try again."
    );
    setAccessToken(data.access_token);
    setStoredUser(data.user);
    return data;
  } catch (err) {
    return handleFetchError(err, "Registration service is temporarily unreachable.");
  }
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<TokenResponse>(
      res,
      "Login failed. Please check your credentials and try again."
    );
    setAccessToken(data.access_token);
    setStoredUser(data.user);
    return data;
  } catch (err) {
    return handleFetchError(err, "Login service is temporarily unreachable.");
  }
}

export async function fetchCurrentUser(): Promise<User> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const user = await handleResponse<User>(res, "Unable to load user profile.");
    setStoredUser(user);
    return user;
  } catch (err) {
    return handleFetchError(err, "Unable to verify current session.");
  }
}

export function logoutUser(): void {
  clearAccessToken();
}

// ---------------------------------------------------------------------------
// Business and Ledger Methods
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Opportunity Lifecycle Stage 1 & 2 API Methods
// ---------------------------------------------------------------------------

export async function analyzeOpportunity(
  submissionType: OpportunityType,
  description: string,
  businessId?: number
): Promise<OpportunityAnalyzeResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/opportunities/analyze`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        submission_type: submissionType,
        description,
        business_id: businessId,
      }),
    });
    return await handleResponse<OpportunityAnalyzeResponse>(
      res,
      "We couldn't analyze your opportunity submission right now. Please try again in a moment."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't analyze your opportunity submission right now. Please try again in a moment."
    );
  }
}

export async function createOpportunity(
  payload: OpportunityCreatePayload
): Promise<Opportunity> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/opportunities`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await handleResponse<Opportunity>(
      res,
      "Unable to save your opportunity draft right now. Please check your information and try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to save your opportunity draft right now. Please check your information and try again."
    );
  }
}

export async function fetchUserOpportunities(
  statusFilter?: OpportunityStatus,
  intentFilter?: OpportunityIntent,
  categoryFilter?: OpportunityCategory
): Promise<OpportunityListResponse> {
  try {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (intentFilter) params.set("intent", intentFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getApiBaseUrl()}/opportunities${query}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    return await handleResponse<OpportunityListResponse>(
      res,
      "We couldn't load your opportunities right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't load your opportunities right now. Please try again."
    );
  }
}

export async function fetchOpportunityById(
  opportunityId: string
): Promise<Opportunity> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    return await handleResponse<Opportunity>(
      res,
      "We couldn't retrieve this opportunity draft. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't retrieve this opportunity draft. Please try again."
    );
  }
}

export async function updateOpportunity(
  opportunityId: string,
  payload: OpportunityUpdatePayload
): Promise<Opportunity> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await handleResponse<Opportunity>(
      res,
      "Unable to update your opportunity draft right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to update your opportunity draft right now. Please try again."
    );
  }
}

export async function reanalyzeOpportunity(
  opportunityId: string,
  description?: string,
  submissionType?: OpportunityType,
  preserveUserEdits: boolean = true
): Promise<Opportunity> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}/reanalyze`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        description,
        submission_type: submissionType,
        preserve_user_edits: preserveUserEdits,
      }),
    });
    return await handleResponse<Opportunity>(
      res,
      "We couldn't reanalyze your opportunity draft right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "We couldn't reanalyze your opportunity draft right now. Please try again."
    );
  }
}

// ---------------------------------------------------------------------------
// Profile System (Individual + Organization)
// ---------------------------------------------------------------------------

export async function fetchMyProfiles(): Promise<ProfileMeResponse> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/profiles/me`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<ProfileMeResponse>(
      res,
      "Unable to load your profile information. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to load your profile information. Please try again."
    );
  }
}

export async function fetchMyIndividualProfile(): Promise<IndividualProfile> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/profiles/me/individual`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<IndividualProfile>(
      res,
      "Unable to load your individual profile. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to load your individual profile. Please try again."
    );
  }
}

export async function updateMyIndividualProfile(
  payload: IndividualProfileUpdatePayload
): Promise<IndividualProfile> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/profiles/me/individual`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await handleResponse<IndividualProfile>(
      res,
      "Unable to update your individual profile. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to update your individual profile. Please try again."
    );
  }
}

export async function updateMyBusinessProfile(
  businessId: number,
  payload: BusinessProfileUpdatePayload
): Promise<Business> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/profiles/me/businesses/${businessId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await handleResponse<Business>(
      res,
      "Unable to update organization profile. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to update organization profile. Please try again."
    );
  }
}

export async function fetchPublicIndividualProfile(
  userId: string
): Promise<IndividualProfile> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/profiles/individuals/${encodeURIComponent(userId)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return await handleResponse<IndividualProfile>(
      res,
      "Unable to load public profile. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to load public profile. Please try again."
    );
  }
}

export async function fetchPublicBusinessProfile(
  businessId: number
): Promise<Business> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/profiles/organizations/${businessId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return await handleResponse<Business>(
      res,
      "Unable to load organization profile. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to load organization profile. Please try again."
    );
  }
}

// ---------------------------------------------------------------------------
// Opportunity Publishing & Lifecycle Controls (Issue #4)
// ---------------------------------------------------------------------------

export async function publishOpportunity(
  opportunityId: string,
  visibilityOrPayload: OpportunityVisibility | OpportunityPublishPayload = "PUBLIC"
): Promise<Opportunity> {
  const visibility =
    typeof visibilityOrPayload === "string"
      ? visibilityOrPayload
      : visibilityOrPayload?.visibility || "PUBLIC";
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}/publish`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ visibility }),
      }
    );
    return await handleResponse<Opportunity>(
      res,
      "Unable to publish opportunity. Please ensure required information is provided."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to publish opportunity. Please ensure required information is provided."
    );
  }
}

export async function unpublishOpportunity(
  opportunityId: string
): Promise<Opportunity> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}/unpublish`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      }
    );
    return await handleResponse<Opportunity>(
      res,
      "Unable to unpublish opportunity. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to unpublish opportunity. Please try again."
    );
  }
}

export async function closeOpportunity(
  opportunityId: string,
  reason?: string
): Promise<Opportunity> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}/close`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
    return await handleResponse<Opportunity>(
      res,
      "Unable to close opportunity. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to close opportunity. Please try again."
    );
  }
}

export async function updateOpportunityVisibility(
  opportunityId: string,
  visibility: OpportunityVisibility
): Promise<Opportunity> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/opportunities/${encodeURIComponent(opportunityId)}/visibility`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ visibility }),
      }
    );
    return await handleResponse<Opportunity>(
      res,
      "Unable to update opportunity visibility. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to update opportunity visibility. Please try again."
    );
  }
}

export async function fetchPublishedOpportunities(
  params?:
    | {
        intent?: string;
        category?: string;
        limit?: number;
        offset?: number;
      }
    | string,
  categoryArg?: string
): Promise<OpportunityListResponse> {
  try {
    let resolvedParams: { intent?: string; category?: string; limit?: number; offset?: number } = {};
    if (typeof params === "string") {
      resolvedParams.intent = params;
      if (categoryArg) resolvedParams.category = categoryArg;
    } else if (params) {
      resolvedParams = params;
    }

    const searchParams = new URLSearchParams();
    if (resolvedParams.intent) searchParams.set("intent", resolvedParams.intent);
    if (resolvedParams.category) searchParams.set("category", resolvedParams.category);
    if (resolvedParams.limit) searchParams.set("limit", String(resolvedParams.limit));
    if (resolvedParams.offset) searchParams.set("offset", String(resolvedParams.offset));

    const url = `${getApiBaseUrl()}/opportunities/published${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<OpportunityListResponse>(
      res,
      "Unable to load published opportunities right now. Please try again."
    );
  } catch (err) {
    handleFetchError(
      err,
      "Unable to load published opportunities right now. Please try again."
    );
  }
}
