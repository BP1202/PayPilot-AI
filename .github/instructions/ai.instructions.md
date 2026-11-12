---
name: AI Engineering Standards
description: Project-specific instructions for LLM integrations, prompt engineering, structured outputs, opportunity extraction, matchmaking, and financial AI intelligence.
applyTo: "backend/**/*ai*.py,backend/**/*llm*.py,backend/**/*prompt*.py,backend/**/*agent*.py,backend/**/*opportunity*.py,frontend/**/*ai*.{ts,tsx},frontend/**/*copilot*.{ts,tsx},frontend/**/*opportunity*.{ts,tsx}"
---

# AI Engineering Instructions

## 1. Product Context & AI Purpose

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

AI services must power the opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

AI capabilities map to specific modules:
- **Idea Capture Studio:** Extract structured business opportunities from raw natural language descriptions, notes, and problem statements.
- **AI Business Analyst:** Structure business models, identify unstated assumptions, analyze risks, and assess commercial requirements.
- **Opportunity Press:** Draft executive summaries, public overviews, and capability needs while keeping sensitive internal notes confidential.
- **Intelligent Matchmaking:** Analyze complementary skills, resources, and goals between participants with explainable match rationale.
- **AI Deal Room:** Assist participants in drafting structured proposals, comparing commercial terms, and defining verifiable milestones.

A generic chatbot that merely answers conversational prompts does not fulfill the product mission.

## 2. Anti-Hallucination and Factuality Rules

- **Zero Invention Rule:** If a user description or opportunity text does not specify an attribute (e.g. website, country, budget, target market), that field MUST remain empty (`""` or `null`). Never invent realistic-sounding placeholders or guess unstated details.
- **Evidence Labeling:** Every AI-generated output or recommendation must distinguish:
  - User-Provided Facts (raw input directly from the user).
  - Verified Data (grounded in database records or validated external APIs).
  - Deterministic Calculations (backend formula/ledger results).
  - AI Hypotheses / Inferences (labeled clearly as suggested interpretations).
  - Action Recommendations (subject to human approval).
  - Missing Information (explicitly highlighted for the user to supply).
- Never fabricate revenue, customer traction, market validation, investor commitments, or commercial guarantees.

## 3. Human-in-the-Loop Safeguards

- AI-generated opportunity drafts, business profiles, and proposals must NEVER be auto-saved or auto-published without explicit user confirmation.
- The UI and backend must present AI suggestions in editable form so the human creator maintains full agency.
- Requiring explicit creator authorization before:
  - Publishing an opportunity to the network.
  - Sharing private notes or confidential attachments.
  - Accepting commercial proposals or milestone terms.
  - Initiating payments or financial transactions.

## 4. Structured Outputs & Schema Enforcement

- Use Pydantic schemas (backend) and TypeScript interfaces (frontend) for all AI outputs.
- Require strict JSON mode or tool-call structured outputs with type validation.
- Validate every field before returning data to frontend or persisting to the database.
- Gracefully handle malformed, partial, or unexpected model responses without crashing or silently corrupting application state.
- Keep machine-readable structured payloads strictly separated from human-readable explanatory text.

## 5. Financial and Pricing Determinism

- **Never rely on an LLM for financial arithmetic, fee calculations, balances, or transaction state transitions.**
- All monetary calculations, currency conversions, milestone sums, and escrow balances must use deterministic backend application logic (`Decimal`).
- AI may suggest milestone breakdowns or pricing strategies, but final pricing totals must be deterministically calculated by backend code.
- AI must never independently authorize, sign, or execute payments or commercial commitments.

## 6. Prompt Engineering & Versioning

- Keep system prompts focused, modular, version-controlled, and testable.
- Explicitly instruct models on role boundaries, tone, format constraints, and negative constraints (what NOT to do).
- Treat all prompt inputs (user notes, opportunity descriptions, external web content) as untrusted user data.
- Defend against prompt injection, jailbreaking, and prompt leaking by sanitizing inputs and using system/user role separation.

## 7. Scoped Tool Calling

- Give tools narrow, single-purpose responsibilities.
- Validate tool arguments with strict schemas prior to execution.
- Enforce user authorization, tenant boundaries, and least-privilege access outside the model.
- Disallow any tool from executing arbitrary shell commands, destructive database updates, or untrusted network calls.
- Prevent infinite tool loops with execution caps and circuit breakers.

## 8. Reliability, Rate Limits & Fallbacks

- Implement exponential backoff, rate limit handling, and sensible timeouts for external model API calls.
- Provide clean, deterministic heuristic fallbacks when AI provider APIs are unavailable.
- Never replace a failed AI call with fabricated data; return a helpful, non-technical error or allow the user to proceed manually.

## 9. Security, Privacy & Data Protection

- Never hardcode or expose AI provider API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, etc.); load them securely via server environment variables.
- Send only the minimal necessary context to model providers; never send credentials, passwords, or unrelated tenant data.
- Respect opportunity visibility settings: private creator notes must never be leaked into public prompt contexts.

## 10. Testing & Evaluation

- Maintain unit and integration tests covering:
  - Extraction accuracy with various input lengths and styles.
  - Missing field handling (confirming unprovided fields stay empty).
  - Schema validation failure handling.
  - Prompt injection resilience.
  - Provider timeout and fallback behavior.
