export interface Business {
  id: number;
  name: string;
  currency: string;
  industry?: string;
  business_type?: string;
  country?: string;
  location?: string | null;
  website?: string;
  description?: string;
  user_id?: string;
  visibility?: ProfileVisibility;
  skills?: string[];
  experience?: string[];
  services?: string[];
  resources?: string[];
  interests?: string[];
  completeness_percent?: number;
  missing_fields?: string[];
  published_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityPublishPayload {
  visibility?: OpportunityVisibility;
}

export interface OpportunityClosePayload {
  reason?: string;
}

export interface OpportunityVisibilityUpdatePayload {
  visibility: OpportunityVisibility;
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

export type OpportunityIntent = "SEEKING_SOLUTION" | "OFFERING_SOLUTION";

export type OpportunityCategory = "FINTECH" | "TECH" | "BUSINESS" | "LOCAL";

export type OpportunityStatus =
  | "DRAFT"
  | "ANALYSED"
  | "PUBLISHED"
  | "MATCHING"
  | "NEGOTIATING"
  | "TRANSACTING"
  | "GROWING"
  | "COMPLETED"
  | "ARCHIVED"
  | "CLOSED";

export type OpportunityVisibility = "PRIVATE" | "AUTHENTICATED" | "PUBLIC" | "SHARED";

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
  intent?: OpportunityIntent;
  category?: OpportunityCategory;
}

export interface OpportunityCreatePayload {
  submission_type: OpportunityType;
  intent?: OpportunityIntent;
  category?: OpportunityCategory;
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
  intent?: OpportunityIntent;
  category?: OpportunityCategory;
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
  intent: OpportunityIntent;
  category: OpportunityCategory;
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

export type ProfileVisibility = "PRIVATE" | "AUTHENTICATED" | "PUBLIC";

export interface IndividualProfile {
  user_id: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  industry?: string | null;
  skills: string[];
  experience: string[];
  services: string[];
  resources: string[];
  interests: string[];
  visibility: ProfileVisibility;
  created_at: string;
  updated_at?: string;
  completeness_percent: number;
  missing_fields: string[];
}

export interface ProfileMeResponse {
  individual: IndividualProfile;
  businesses: Business[];
}

export interface IndividualProfileUpdatePayload {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  industry?: string | null;
  skills?: string[];
  experience?: string[];
  services?: string[];
  resources?: string[];
  interests?: string[];
  visibility?: ProfileVisibility;
}

export interface BusinessProfileUpdatePayload {
  name?: string;
  currency?: string;
  industry?: string | null;
  business_type?: string | null;
  country?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  visibility?: ProfileVisibility;
  skills?: string[];
  experience?: string[];
  services?: string[];
  resources?: string[];
  interests?: string[];
}

export interface OpportunityPublic {
  id: string;
  business_id?: number | null;
  business_name?: string | null;
  submission_type: OpportunityType;
  intent: OpportunityIntent;
  category: OpportunityCategory;
  status: OpportunityStatus;
  visibility: OpportunityVisibility;
  title: string;
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
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityDiscoveryParams {
  q?: string;
  intent?: OpportunityIntent;
  category?: OpportunityCategory;
  industry?: string;
  skill?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

export interface OpportunityDiscoveryResponse {
  items: OpportunityPublic[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// Matchmaking & Explainable Recommendations Types
// ---------------------------------------------------------------------------

export type MatchTier = "STRONG_MATCH" | "MODERATE_MATCH" | "EXPLORATORY";

export interface MatchExplanation {
  match_tier: MatchTier;
  score: number;
  strong_signals: string[];
  partial_signals: string[];
  missing_information: string[];
  potential_gaps: string[];
  explanation_summary: string;
  mode: "LIVE_AI" | "DETERMINISTIC_FALLBACK";
  provenance: "AI_INFERRED" | "DETERMINISTIC_CALCULATION";
}

export interface ParticipantCandidate {
  participant_type: "INDIVIDUAL" | "BUSINESS";
  id: string | number;
  name: string;
  headline?: string | null;
  industry?: string | null;
  location?: string | null;
  skills: string[];
  services: string[];
  resources?: string[];
  experience?: string[];
  explanation: MatchExplanation;
}

export interface OpportunityCandidate {
  id: string;
  title: string;
  submission_type: OpportunityType;
  intent: OpportunityIntent;
  category: OpportunityCategory;
  industry?: string | null;
  required_skills_and_resources: string[];
  value_proposition?: string | null;
  published_at?: string | null;
  explanation: MatchExplanation;
}

export interface OpportunityMatchesResponse {
  total: number;
  items: OpportunityCandidate[];
  mode: "LIVE_AI" | "DETERMINISTIC_FALLBACK";
}

export interface ParticipantMatchesResponse {
  opportunity_id: string;
  opportunity_title: string;
  total: number;
  items: ParticipantCandidate[];
  mode: "LIVE_AI" | "DETERMINISTIC_FALLBACK";
}

// ===== Connections & Proposals =====

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
export type ConnectionIntent =
  | "EXPLORE_COLLABORATION"
  | "OFFER_CAPABILITY"
  | "SEEK_ASSISTANCE"
  | "CO_FOUNDER"
  | "PARTNERSHIP";

export type ProposalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ParticipantCard {
  user_id: string;
  full_name?: string | null;
  headline?: string | null;
  industry?: string | null;
  skills: string[];
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  intent: ConnectionIntent;
  message: string;
  response_note?: string | null;
  requester: ParticipantCard;
  recipient: ParticipantCard;
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  withdrawn_at?: string | null;
  created_at: string;
}

export interface ConnectionListResponse {
  items: Connection[];
  total: number;
  pending_count: number;
  accepted_count: number;
}

export interface ProposalMilestoneItem {
  id: string;
  title: string;
  description?: string | null;
  amount: string; // Decimal as string
  target_date?: string | null;
}

export interface ProposalRevision {
  id: string;
  version: number;
  title: string;
  description: string;
  scope_of_work?: string | null;
  deliverables: string[];
  budget_amount?: string | null;
  currency: string;
  milestones: ProposalMilestoneItem[];
  responsibilities: Record<string, string>;
  assumptions: string[];
  conditions: string[];
  notes?: string | null;
  change_summary?: string | null;
  created_by_id: string;
  created_at: string;
}

export interface Proposal {
  id: string;
  connection_id: string;
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  proposer: ParticipantCard;
  recipient: ParticipantCard;
  status: ProposalStatus;
  current_version: number;
  title: string;
  description: string;
  scope_of_work?: string | null;
  deliverables: string[];
  budget_amount?: string | null; // Decimal as string
  currency: string;
  timeline_summary?: string | null;
  estimated_duration_days?: number | null;
  milestones: ProposalMilestoneItem[];
  responsibilities: Record<string, string>;
  assumptions: string[];
  conditions: string[];
  notes?: string | null;
  proposer_accepted_at?: string | null;
  recipient_accepted_at?: string | null;
  accepted_version?: number | null;
  rejection_reason?: string | null;
  revision_requested_note?: string | null;
  revisions: ProposalRevision[];
  created_at: string;
  updated_at: string;
}

export interface ProposalListResponse {
  items: Proposal[];
  total: number;
}

export interface CollaborationActivity {
  id: string;
  entity_type: "CONNECTION" | "PROPOSAL";
  entity_id: string;
  activity_type: string;
  title: string;
  details?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ConnectionCreatePayload {
  recipient_id: string;
  opportunity_id?: string | null;
  intent: ConnectionIntent;
  message: string;
}

export interface ConnectionRespondPayload {
  action: "ACCEPT" | "DECLINE";
  response_note?: string | null;
}

export interface ProposalCreatePayload {
  connection_id: string;
  opportunity_id?: string | null;
  title: string;
  description: string;
  scope_of_work?: string | null;
  deliverables: string[];
  budget_amount?: string | null; // Send as string for Decimal safety
  currency: string;
  timeline_summary?: string | null;
  estimated_duration_days?: number | null;
  milestones: ProposalMilestoneItem[];
  responsibilities: Record<string, string>;
  assumptions: string[];
  conditions: string[];
  notes?: string | null;
}

export interface ProposalActionPayload {
  action: "ACCEPT" | "REJECT" | "REQUEST_REVISION" | "WITHDRAW";
  note?: string | null;
}

// ============================================================================
// DEAL ROOM TYPES (Issue #8)
// ============================================================================

export type DealRoomStatus =
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETION_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export type DealRoomDocumentType =
  | "SPECIFICATION"
  | "DESIGN"
  | "REFERENCE_LINK"
  | "CONTRACT_PREVIEW"
  | "DELIVERABLE_DRAFT"
  | "OTHER";

export type DealRoomActivityType =
  | "ROOM_CREATED"
  | "STATUS_CHANGED"
  | "NOTE_ADDED"
  | "DOCUMENT_ATTACHED"
  | "DOCUMENT_DELETED"
  | "CLARIFICATION_OPENED"
  | "CLARIFICATION_ANSWERED";

export type DealRoomClarificationStatus = "OPEN" | "RESOLVED";

export interface DealRoomParticipantCard {
  id: string;
  user_id: string;
  name: string;
  headline?: string | null;
  industry?: string | null;
  collaboration_role: string;
  assigned_responsibilities?: string | null;
  joined_at: string;
}

export interface DealRoomDocument {
  id: string;
  room_id: string;
  uploaded_by_id: string;
  uploader_name: string;
  title: string;
  document_type: DealRoomDocumentType | string;
  reference_url: string;
  description?: string | null;
  created_at: string;
}

export interface DealRoomNote {
  id: string;
  room_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealRoomClarification {
  id: string;
  room_id: string;
  asked_by_id: string;
  asker_name: string;
  question: string;
  status: DealRoomClarificationStatus;
  answered_by_id?: string | null;
  answerer_name?: string | null;
  answer?: string | null;
  answered_at?: string | null;
  created_at: string;
}

export interface DealRoomActivity {
  id: string;
  room_id: string;
  actor_id: string;
  actor_name: string;
  activity_type: DealRoomActivityType;
  title: string;
  details?: string | null;
  created_at: string;
}

export interface DealRoomMilestoneItem {
  title: string;
  description?: string;
  amount?: number | string;
  target_date?: string;
  due_days?: number;
  status?: string;
}

export interface DealRoom {
  id: string;
  proposal_id: string;
  connection_id: string;
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  title: string;
  description: string;
  status: DealRoomStatus;
  status_reason?: string | null;
  accepted_proposal_version: number;

  // Agreed Terms Snapshot
  agreed_scope_of_work?: string | null;
  agreed_deliverables: string[];
  agreed_budget_amount?: string | null;
  agreed_currency: string;
  agreed_timeline_summary?: string | null;
  agreed_estimated_duration_days?: number | null;
  agreed_milestones: DealRoomMilestoneItem[];
  agreed_responsibilities: Record<string, string>;
  agreed_assumptions: string[];
  agreed_conditions: string[];
  agreed_notes?: string | null;

  participants: DealRoomParticipantCard[];
  created_at: string;
  updated_at: string;
}

export interface DealRoomOverview {
  id: string;
  title: string;
  status: DealRoomStatus;
  status_reason?: string | null;
  accepted_proposal_version: number;
  opportunity_title?: string | null;
  participants: DealRoomParticipantCard[];
  scope_preview?: string | null;
  deliverables_count: number;
  milestones_count: number;
  total_budget?: string | null;
  currency: string;
  estimated_duration_days?: number | null;
  recent_activities: DealRoomActivity[];
  open_clarifications_count: number;
  pinned_notes_count: number;
  documents_count: number;
}

export interface DealRoomListResponse {
  items: DealRoom[];
  total: number;
}

export interface DealRoomAIAnalysisResponse {
  analysis_type: string;
  summary: string;
  key_findings: string[];
  actionable_recommendations: string[];
  provenance_breakdown: Record<string, string[]>;
  mode: "LIVE_AI" | "DETERMINISTIC_FALLBACK";
  provider: string;
  model: string;
}

export interface DealRoomCreatePayload {
  proposal_id: string;
}

export interface DealRoomStatusUpdatePayload {
  status: DealRoomStatus;
  reason?: string | null;
}

export interface DealRoomNoteCreatePayload {
  title: string;
  content: string;
  is_pinned?: boolean;
}

export interface DealRoomClarificationCreatePayload {
  question: string;
}

export interface DealRoomClarificationAnswerPayload {
  answer: string;
}

export interface DealRoomDocumentCreatePayload {
  title: string;
  document_type: DealRoomDocumentType;
  reference_url: string;
  description?: string | null;
}

// ===== Issue #9: Milestone Execution, Deliverables & Evidence Verification =====

export type MilestoneExecutionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "REVISION_REQUESTED"
  | "REJECTED"
  | "APPROVED"
  | "CANCELLED";

export type PaymentReadinessStatus =
  | "NOT_READY"
  | "READY_FOR_PAYMENT_REVIEW"
  | "PAYMENT_IN_PROGRESS"
  | "PAID";

export type MilestoneEvidenceType =
  | "DOCUMENT"
  | "IMAGE"
  | "VIDEO_LINK"
  | "EXTERNAL_REFERENCE"
  | "CODE_REPOSITORY"
  | "OTHER";

export type EvidenceReviewStatus =
  | "PENDING_REVIEW"
  | "REVISION_REQUESTED"
  | "REJECTED"
  | "APPROVED"
  | "SUPERSEDED";

export type MilestoneReviewDecision = "APPROVED" | "REVISION_REQUESTED" | "REJECTED";

export interface MilestoneParticipantSummary {
  user_id: string;
  id?: string;
  name: string;
  full_name?: string;
  email?: string | null;
  role?: string | null;
}

export interface MilestoneEvidence {
  id: string;
  milestone_id: string;
  room_id: string;
  submitted_by_id: string;
  submitter_name: string;
  submission_version: number;
  title: string;
  description: string;
  evidence_type: MilestoneEvidenceType;
  reference_url: string;
  attachments: Record<string, any>[];
  status: EvidenceReviewStatus;
  submission_notes?: string | null;
  created_at: string;
}

export interface MilestoneReview {
  id: string;
  milestone_id: string;
  evidence_id: string;
  evidence_version: number;
  reviewer_id: string;
  reviewer_name: string;
  decision: MilestoneReviewDecision;
  comments?: string | null;
  created_at: string;
}

export interface MilestoneExecution {
  id: string;
  room_id: string;
  source_proposal_id: string;
  accepted_proposal_version: number;
  milestone_index: number;
  title: string;
  description?: string | null;
  expected_deliverables: string[];
  agreed_amount?: string | null;
  currency: string;
  due_days?: number | null;
  planned_due_date?: string | null;
  responsible_user: MilestoneParticipantSummary;
  reviewer_user: MilestoneParticipantSummary;
  payer_user_id?: string | null;
  payee_user_id?: string | null;
  status: MilestoneExecutionStatus;
  cancellation_reason?: string | null;
  payment_readiness: PaymentReadinessStatus;
  current_evidence_submission?: MilestoneEvidence | null;
  evidence_history?: MilestoneEvidence[];
  review_history?: MilestoneReview[];
  evidence_submissions_count: number;
  reviews_count: number;
  started_at?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneListResponse {
  items: MilestoneExecution[];
  total: number;
  completed_count: number;
  in_progress_count: number;
  pending_review_count: number;
  total_agreed_amount: string;
  approved_amount: string;
}

export interface MilestonePaymentReadinessResponse {
  milestone_id: string;
  room_id: string;
  title: string;
  payment_readiness: PaymentReadinessStatus;
  agreed_amount?: string | null;
  currency: string;
  approved_evidence_id?: string | null;
  approved_evidence_version?: number | null;
  reviewer_id?: string | null;
  approved_at?: string | null;
  source_proposal_version: number;
  settlement_note: string;
}

export interface MilestoneEvidenceCreatePayload {
  title: string;
  description: string;
  evidence_type?: MilestoneEvidenceType;
  reference_url: string;
  submission_notes?: string | null;
  attachments?: Record<string, any>[];
}

export interface MilestoneReviewPayload {
  evidence_id: string;
  decision: MilestoneReviewDecision;
  comments?: string | null;
}

export interface MilestoneCancelPayload {
  reason: string;
}

export interface MilestoneDeliverableCheck {
  deliverable: string;
  satisfied: boolean;
  confidence: number;
  explanation: string;
}

export interface MilestoneAIAnalysisResponse {
  milestone_id: string;
  completeness_score: number;
  deliverables_analysis: MilestoneDeliverableCheck[];
  review_checklist: string[];
  observations: string[];
  provenance_breakdown: Record<string, string[]>;
  mode: "LIVE_AI" | "DETERMINISTIC_FALLBACK";
  provider: string;
  model: string;
}

export type DashboardView =
  | "home"
  | "opportunities"
  | "explore"
  | "browse"
  | "my-opportunities"
  | "matches"
  | "collaborations"
  | "deal-rooms"
  | "ledger"
  | "trust"
  | "profile"
  | "organisations"
  | "settings";

export type UserRole = "seeker" | "creator";

export interface CreatePayPalOrderPayload {
  idempotency_key: string;
  return_url?: string;
  cancel_url?: string;
}

export interface PayPalOrderResponse {
  transaction_id: string;
  transaction_ref: string;
  paypal_order_id: string;
  order_status: string;
  approval_url: string;
  currency: string;
  amount: string;
}

export interface CapturePayPalOrderPayload {
  idempotency_key: string;
}

export interface PayPalCaptureResponse {
  transaction_id: string;
  transaction_ref: string;
  paypal_order_id: string;
  paypal_capture_id: string;
  capture_status: string;
  transaction_status: string;
  payment_readiness: string;
  currency: string;
  amount: string;
}

export interface MilestoneSettlementStatus {
  milestone_id: string;
  room_id: string;
  status: "NOT_PREPARED" | "PREPARED" | "ORDER_CREATED" | "AWAITING_APPROVAL" | "COMPLETED" | "FAILED" | "CANCELLED";
  payment_readiness: string;
  agreed_amount?: string | null;
  currency: string;
  payer_user_id?: string | null;
  payee_user_id?: string | null;
  transaction_id?: string | null;
  transaction_ref?: string | null;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  approval_url?: string | null;
}





