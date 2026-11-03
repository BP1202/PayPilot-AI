export interface Business {
  id: number;
  name: string;
  currency: string;
  industry?: string;
  business_type?: string;
  country?: string;
  website?: string;
  description?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfileExtraction {
  name: string;
  description: string;
  industry: string;
  business_type: string;
  country: string;
  website: string;
  currency: string;
  confidence: number;
  extracted_fields: string[];
}

export interface BusinessCreatePayload {
  name: string;
  currency: string;
  industry?: string;
  business_type?: string;
  country?: string;
  website?: string;
  description?: string;
  user_id?: string;
}

export interface DashboardTotals {
  business_id: number;
  currency: string;
  total_revenue: string;
  transaction_count: number;
  completed_count: number;
  pending_count: number;
  pending_total: string;
}

export interface DashboardOverview {
  business: Business;
  totals: DashboardTotals;
}

export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type TransactionType = "CUSTOMER_PAYMENT" | "REFUND";

export interface Transaction {
  id: number;
  transaction_ref: string;
  business_id: number;
  amount: string;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  payment_method: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  provider_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerListResponse {
  items: Transaction[];
  total: number;
}

export interface FinancialImpact {
  current_revenue: string;
  projected_revenue: string;
  net_change: string;
  percentage_increase: string;
}

export interface RecommendedAction {
  action_type: string;
  transaction_ref?: string;
  amount?: string;
  currency: string;
  customer_name?: string;
  rationale: string;
}

export type CopilotMode = "DETERMINISTIC_DEMO" | "LIVE_AI";

export interface CopilotRecommendation {
  title: string;
  mode: CopilotMode;
  reasoning: string;
  financial_impact: FinancialImpact;
  suggested_action?: RecommendedAction | null;
  generated_at: string;
}

export interface CopilotChatResponse {
  reply: string;
  mode: CopilotMode;
  confidence: number;
  context_summary: Record<string, any>;
}

export interface ApprovePaymentRequest {
  transaction_ref: string;
  owner_approved: boolean;
  idempotency_key: string;
}
