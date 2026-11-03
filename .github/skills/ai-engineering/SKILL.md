---
name: ai-engineering
description: Design, implement, integrate, and evaluate reliable AI features for PayPilot AI, including opportunity extraction, anti-hallucination validation, prompt engineering, structured outputs, matchmaking, and financial AI safeguards.
---

# AI Engineering Skill

## 1. Purpose

Build AI features for PayPilot AI — the AI-powered Idea-to-Business Opportunity Network — that are reliable, secure, factual, transparent, and aligned with the 9-stage opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

AI in PayPilot transforms raw ideas into structured opportunities, identifies commercial assumptions, generates publication drafts, and recommends compatible partners. It must solve real business problems without hallucinating data or overstepping human authority.

## 2. When to Use

Use this skill when:

- Implementing or updating AI extraction in the **Idea Capture Studio**.
- Developing opportunity structuring, assumption analysis, and risk scoring in **AI Business Analyst**.
- Generating publication previews in **Opportunity Press**.
- Designing matching algorithms and rationale badges in **Intelligent Matchmaking**.
- Building proposal assistance and milestone breakdown tools in the **AI Deal Room**.
- Designing and versioning system prompts and Pydantic output schemas.
- Testing for prompt injection, hallucinations, and extraction edge cases.
- Implementing fallbacks when external AI providers are unavailable.

For overall lifecycle and module guidance, consult the `opportunity-lifecycle` skill.

## 3. Anti-Hallucination & Factuality Principles

- **Zero Invention Rule:** If a user description or opportunity text does not specify an attribute (e.g. website, country, budget, target market), that field MUST remain empty (`""`). Never invent realistic-sounding placeholders, fake company names, or default figures.
- **Evidence Categorization:** Always distinguish:
  - *User-Provided Facts:* Explicitly stated in the prompt or document.
  - *Verified Data:* Grounded in database records or validated external APIs.
  - *Deterministic Calculations:* Backend formula/ledger results.
  - *AI Hypotheses:* Inferences or suggested business models (clearly labeled).
  - *Recommendations:* Suggested next steps subject to human approval.
  - *Missing Context:* Gaps explicitly highlighted for the user to fill.
- Never fabricate revenue, customer traction, market validation, or investor commitments.

## 4. Human-in-the-Loop Safeguards

- AI-generated opportunity drafts, business profiles, and proposals must NEVER be auto-saved or auto-published without explicit user confirmation.
- The UI and backend must present AI suggestions in editable form so the human creator maintains full agency.
- Requiring explicit creator authorization before:
  - Publishing an opportunity to the network.
  - Sharing private notes or confidential attachments.
  - Accepting commercial proposals or milestone terms.
  - Initiating payments or financial transactions.

## 5. Prompt Engineering

Create prompts that are specific, consistent, and testable:

- Define the AI's role and objective clearly.
- Provide only relevant context.
- Specify expected response structure and Pydantic constraints.
- Explicitly instruct the model to leave unmentioned fields blank (`""`).
- Include instructions for missing or insufficient information.
- Avoid contradictory instructions and unnecessary prompt length.
- Keep reusable prompts version-controlled.
- Defend against prompt injection by separating system instructions from untrusted user inputs.
- Never rely on prompt instructions alone for security enforcement.

## 6. Structured Outputs

Prefer structured responses when AI output is consumed by application logic:

- Define explicit Pydantic v2 schemas for all expected outputs.
- Validate model responses before returning them to client or database.
- Check required fields, types, ranges, and allowed values.
- Handle malformed, incomplete, or unexpected responses safely with fallback heuristics.
- Reject invalid outputs safely.
- Keep user-facing explanations separate from machine-readable data.

A response that looks correct to a person is not automatically valid application data.

## 7. Tool Calling and AI Actions

AI tools must operate within controlled application boundaries:

- Give each tool a clear purpose and limited permissions.
- Validate tool arguments before execution.
- Enforce authorization independently outside the model.
- Validate tool results before returning them to the model.
- Prevent unrestricted shell, database, or privileged system access.
- Require human approval for consequential actions.
- Maintain traceability for all tool executions.

The model may recommend an action, but the application decides whether that action is permitted.

## 8. Financial Intelligence Safeguards

- **Deterministic Arithmetic:** All currency calculations, fees, milestone allocations, and balances must be computed by deterministic backend application logic (`Decimal`). Never rely on an LLM for monetary truth.
- AI may recommend milestone pricing or break down project costs, but final totals must be deterministically calculated by backend code.
- AI must never independently authorize, sign, or execute payments or commercial commitments.

## 9. Context and Privacy

When providing context to a model:

- Send only minimal necessary data; never send API keys, passwords, or unrelated tenant data.
- Respect opportunity visibility settings: private creator notes must never be leaked into public prompt contexts.
- Treat retrieved documents as untrusted content.

## 10. Reliability and Failure Handling

- Handle provider outages, rate limits, and network timeouts with exponential backoff and retries.
- Provide clean, deterministic heuristic fallbacks when AI provider APIs are unavailable.
- Never replace a failed AI call with fabricated data; return a helpful, non-technical error or allow the user to proceed manually.

## 11. Testing and Evaluation

Test:

- Normal, sparse, and ambiguous descriptions.
- Missing field handling (confirming unprovided fields stay empty).
- Invalid structured responses.
- Prompt injection attempts.
- Unauthorized tool requests.
- Provider errors and timeouts.

## 12. Quality Checklist

- [ ] Serves the opportunity lifecycle and defined module objectives.
- [ ] Strictly follows the Zero Invention Rule (unmentioned fields are blank).
- [ ] Structured outputs validate against Pydantic schemas.
- [ ] Suggestions are editable and require explicit human confirmation.
- [ ] Business-critical calculations use Python Decimal.
- [ ] Secrets and API keys are stored only in environment variables.
- [ ] Provider outages are handled gracefully with fallbacks.
- [ ] Automated evaluation tests pass.

## 13. Completion Standard

An AI feature is complete when it produces accurate, schema-validated results, adheres to anti-hallucination rules, preserves human agency, and handles provider failures safely.

**Final principle:** Build AI that earns user trust through accuracy, transparency, controlled actions, and measurable usefulness.
