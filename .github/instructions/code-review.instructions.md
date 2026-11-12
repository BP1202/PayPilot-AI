---
name: Code Review Standards
description: Project-wide standards for reviewing code changes, verifying opportunity lifecycle compliance, assessing security, and evaluating implementation quality.
applyTo: "**/*"
---

# Code Review Instructions

## 1. Product Context & Review Purpose

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

Code reviews must evaluate whether changes align with the 9-stage opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

Reviews must ensure implementations:
- Preserve Opportunity as the central product entity.
- Respect clear module boundaries (Idea Capture Studio, AI Business Analyst, Opportunity Press, Discovery Network, Intelligent Matchmaking, AI Deal Room, Payments & Transaction Intelligence, Opportunity Evolution).
- Protect creator idea confidentiality and publication visibility controls (`PRIVATE`, `SHARED`, `PUBLIC`).
- Enforce human-in-the-loop authorization on consequential commercial and publication decisions.
- Strictly adhere to anti-hallucination and evidence transparency rules.
- Maintain deterministic financial calculations (Python `Decimal`) and official PayPal REST API standards.
- Deliver non-technical, empathetic user error messages without leaking stack traces or internal endpoints.

## 2. Review Priorities

Classify findings consistently:

- **Critical:** Severe security vulnerability, credential leak, financial loss/calculation error, data corruption, or unauthorized public disclosure of private ideas.
- **High:** Major functional defect, broken opportunity lifecycle flow, exploitable permission check, or serious data integrity violation.
- **Medium:** Incorrect behavior in specific scenarios, unhandled error cases, technical error messages exposed to UI, or meaningful maintainability concerns.
- **Low:** Minor improvements with limited impact, naming clarifications, or documentation polish.

Explain the evidence and reasoning behind each assigned severity.

## 3. Opportunity Lifecycle & Correctness Checks

Check:

- **Requirement Compliance:** Does the change serve a clearly defined product objective without unnecessary scope creep?
- **Anti-Hallucination:** Are unprovided fields left blank (`""`), rather than filled with fictional placeholders?
- **Evidence Transparency:** Are user-provided facts, AI hypotheses, verified external data, and recommendations clearly distinguished?
- **Human Authority:** Does the implementation require explicit creator confirmation before saving AI suggestions, publishing opportunities, accepting Deal Room proposals, or capturing payments?
- **User Experience & Errors:** Are error messages empathetic and free of technical jargon, stack traces, or internal URLs (e.g., `http://127.0.0.1:8000/api/v1`)?
- **Separation of Concerns:** Are UI components, API routes, business logic, and database models cleanly decoupled?

## 4. Security & Privacy Review

Check:

- **Secrets Handling:** No API keys, credentials, or tokens hardcoded in source files or client bundles.
- **Tenant Isolation:** Every opportunity, business profile, proposal, and transaction query enforces ownership verification (`user_id`).
- **Visibility Boundaries:** Private notes and internal financial models are hidden from public or uninvited users.
- **Injection Risks:** Parameterized SQL queries, sanitized HTML/XSS defenses, and safe prompt construction.
- **AI Tool Calling:** Scoped permissions outside the model with zero arbitrary execution capabilities.

## 5. Financial & Payment Integrity (PayPal)

For payment and fintech code:

- **Deterministic Arithmetic:** Ensure Python `Decimal` is used for all monetary amounts, fees, and ledger calculations.
- **Official PayPal APIs:** Integration uses official REST API v2 endpoints with backend-managed credentials.
- **Webhook Authenticity:** PayPal webhook signatures are cryptographically validated before updating database records.
- **Idempotency:** Unique reference IDs prevent duplicate charges or double ledger entries.
- **Traceability:** Internal transaction records link directly to PayPal Order/Capture IDs and Deal Room milestones.
- **Environment Separation:** Strict isolation between Sandbox and live production modes.

## 6. Testing & Quality Review

- Verify that relevant tests were added or updated covering happy paths, edge cases, and validation failures.
- Ensure tests for financial calculations and state transitions are deterministic and isolated.
- Confirm assertions test real outcomes rather than mocking away the logic under test.
- Distinguish tests inspected from tests actually executed with command results.
- Never approve code on assumed test passes; verify actual execution outputs.

## 7. Performance & Maintainability

Review for:

- Avoidance of N+1 database queries and unindexed lookups.
- Component re-render optimization and minimal client-side JavaScript.
- Clear module boundaries and descriptive naming.
- Clean API schemas and typed contracts between frontend and backend.

## 8. Finding Format

For each significant finding, provide:

- **Severity:** Critical / High / Medium / Low.
- **Location:** File path and line numbers.
- **Description:** Concise statement of the defect or risk.
- **Impact:** Why it matters to product integrity, security, or user trust.
- **Recommended Fix:** Clear, minimal, and actionable remediation.

## 9. Review Boundaries

- Avoid bikeshedding over personal formatting or stylistic preferences.
- Do not request unrelated refactorings or introduce speculative features.
- Provide objective, evidence-based feedback that improves product trust and software quality.
