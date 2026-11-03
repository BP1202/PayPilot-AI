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

// ---------------------------------------------------------------------------
// Opportunity Domain & Stage 1-2 Lifecycle Interfaces
// ---------------------------------------------------------------------------

export type OpportunityType = "IDEA" | "PROBLEM";

export type OpportunityStatus =
  | "DRAFT"
  | "ANALYSED"
  | "PUBLISHED"
  | "MATCHING"
  | "NEGOTIATING"
  | "TRANSACTING"
  | "GROWING"
  | "COMPLETED"
  | "ARCHIVED";

export type OpportunityVisibility = "PRIVATE" | "SHARED" | "PUBLIC";

export type ProvenanceCategory =
  | "USER_PROVIDED"
  | "AI_SUGGESTION"
  | "AI_HYPOTHESIS"
  | "VERIFIED_EXTERNAL"
  | "DETERMINISTIC_CALCULATION"
  | "MISSING_UNKNOWN";

export interface OpportunityAnalysisData {
  suggested_title: string;
  problem_statement: string;
  proposed_solution: string;
  target_customer_segments: string[];
  customer_pain_points: string[];
  value_proposition: string;
  industry: string;
  required_skills_and_resources: string[];
  potential_business_models: string[];
  key_assumptions: string[];
  risks_and_uncertainties: string[];
  missing_information: string[];
  suggested_follow_up_questions: string[];
  provenance: Record<string, ProvenanceCategory>;
  ai_metadata: Record<string, any>;
}

export interface OpportunityAnalyzeResponse {
  submission_type: OpportunityType;
  original_description: string;
  analysis: OpportunityAnalysisData;
  mode: "LIVE_AI" | "DETERMINISTIC_FALLBACK";
  provider?: string;
  model?: string;
  confidence: number;
  message: string;
}

export interface OpportunityCreatePayload {
  submission_type: OpportunityType;
  title: string;
  original_description: string;
  problem_statement?: string;
  proposed_solution?: string;
  industry?: string;
  value_proposition?: string;
  target_customer_segments?: string[];
  customer_pain_points?: string[];
  required_skills_and_resources?: string[];
  potential_business_models?: string[];
  key_assumptions?: string[];
  risks_and_uncertainties?: string[];
  missing_information?: string[];
  suggested_follow_up_questions?: string[];
  provenance?: Record<string, any>;
  ai_metadata?: Record<string, any>;
  business_id?: number;
  status?: OpportunityStatus;
  visibility?: OpportunityVisibility;
}

export interface OpportunityUpdatePayload {
  title?: string;
  original_description?: string;
  problem_statement?: string;
  proposed_solution?: string;
  industry?: string;
  value_proposition?: string;
  target_customer_segments?: string[];
  customer_pain_points?: string[];
  required_skills_and_resources?: string[];
  potential_business_models?: string[];
  key_assumptions?: string[];
  risks_and_uncertainties?: string[];
  missing_information?: string[];
  suggested_follow_up_questions?: string[];
  provenance?: Record<string, any>;
  ai_metadata?: Record<string, any>;
  status?: OpportunityStatus;
  visibility?: OpportunityVisibility;
  business_id?: number;
}

export interface Opportunity {
  id: string;
  user_id: string;
  business_id?: number | null;
  submission_type: OpportunityType;
  status: OpportunityStatus;
  visibility: OpportunityVisibility;
  title: string;
  original_description: string;
  problem_statement?: string | null;
  proposed_solution?: string | null;
  industry?: string | null;
  value_proposition?: string | null;
  target_customer_segments: string[];
  customer_pain_points: string[];
  required_skills_and_resources: string[];
  potential_business_models: string[];
  key_assumptions: string[];
  risks_and_uncertainties: string[];
  missing_information: string[];
  suggested_follow_up_questions: string[];
  provenance: Record<string, any>;
  ai_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface OpportunityListResponse {
  items: Opportunity[];
  total: number;
}
