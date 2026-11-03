---
name: code-review
description: Review code changes for correctness, security, maintainability, performance, opportunity lifecycle compliance, and regressions before approval or release for PayPilot AI.
---

# Code Review Skill

## 1. Purpose

Ensure code changes in PayPilot AI are correct, secure, maintainable, user-friendly, and consistent with the project's product vision:
**AI-powered Idea-to-Business Opportunity Network** (`Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow`).

A code review must identify meaningful defects and lifecycle violations before they reach users, without encouraging unnecessary rewrites or subjective nitpicks.

## 2. When to Use

Use this skill when:

- Reviewing new features, bug fixes, or pull requests across PayPilot's 8 core modules.
- Checking AI-generated extraction and prompt engineering code.
- Reviewing Opportunity domain models, status transitions, and visibility permissions.
- Inspecting Deal Room proposal workflows and dual-party confirmation states.
- Reviewing PayPal payment integrations, webhooks, and Commerce Ledger entries.
- Evaluating security, authentication, and tenant isolation controls.
- Checking that user-facing error messages are free of technical jargon.
- Preparing changes for merging or release.

For overall opportunity lifecycle and module guidance, consult the `opportunity-lifecycle` skill.

## 3. Review Principles

- Understand the product problem and affected lifecycle stage before reviewing the implementation.
- Prioritize correctness, security, and data integrity over personal style preferences.
- Focus on actionable, evidence-based, and reproducible issues.
- Distinguish confirmed defects from speculative risks.
- Avoid requesting unnecessary refactorings or introducing scope creep.
- Never assume code is correct simply because automated tests pass.

## 4. Review Priorities

Evaluate findings using these severity levels:

- **Critical:** Severe security vulnerability, credential leak, financial loss/calculation error, data corruption, or unauthorized public disclosure of private ideas.
- **High:** Significant functional defect, broken opportunity lifecycle flow, exploitable permission check, or serious data integrity violation.
- **Medium:** Incorrect behavior in specific scenarios, unhandled error cases, technical error messages exposed to UI, or meaningful maintainability concerns.
- **Low:** Minor improvements with limited impact, naming clarifications, or documentation polish.

Prioritize findings by actual impact on user trust, commercial integrity, and system stability.

## 5. Opportunity Lifecycle & Correctness Checks

Check:

- **Lifecycle Stage Alignment:** Does the change support an approved stage in the 9-stage lifecycle?
- **Anti-Hallucination:** Are unprovided fields left blank (`""`), rather than filled with fictional defaults?
- **Evidence Transparency:** Are user-provided facts, AI hypotheses, verified external data, and recommendations clearly distinguished?
- **Human Authority:** Does the implementation require explicit creator confirmation before saving AI suggestions, publishing opportunities, accepting Deal Room proposals, or capturing payments?
- **User Experience & Errors:** Are error messages empathetic, helpful, and completely free of technical jargon, stack traces, or internal URLs (e.g. `http://127.0.0.1:8000/api/v1`)?
- **Separation of Concerns:** Are UI components, API routes, domain logic, and database models cleanly decoupled?

## 6. Security and Privacy Review

Inspect for:

- Hardcoded or exposed secrets (all credentials must be in environment variables).
- Tenant isolation: every opportunity, business profile, proposal, and transaction query enforces ownership (`user_id`).
- Idea confidentiality: private creator notes and internal financial models must be hidden from public queries.
- Visibility enforcement: strict separation between `PRIVATE`, `SHARED`, and `PUBLIC` states.
- Injection vulnerabilities (SQL, XSS, command injection).
- Sensitive information leakage in server logs, API responses, or UI errors.
- AI prompt injection vulnerabilities and excessive tool permissions.

## 7. Financial & PayPal Integrity

For fintech and payment code:

- **Deterministic Arithmetic:** All monetary amounts, fees, and ledger calculations use Python `Decimal`. Never use floating-point or LLM arithmetic for money.
- **Official PayPal APIs:** Integration uses official REST API v2 endpoints with backend-managed credentials.
- **Webhook Authenticity:** PayPal webhook signatures are cryptographically validated before updating database records.
- **Idempotency:** Unique reference IDs prevent duplicate charges or double ledger entries.
- **Traceability:** Internal transaction records link directly to PayPal Order/Capture IDs and Deal Room milestones.
- **Environment Separation:** Strict isolation between Sandbox and live production modes.

## 8. Architecture and Maintainability

Check whether:

- Code follows existing FastAPI and Next.js project patterns.
- Existing utilities and components are reused where practical.
- API contracts remain typed and consistent between backend Pydantic models and frontend TypeScript types.
- Database changes follow Alembic migration conventions.
- No unnecessary dependencies or frameworks are introduced without justification.

## 9. Performance and Reliability

Review for:

- N+1 database queries and unindexed foreign key lookups.
- Inefficient loops and expensive frontend re-renders.
- Missing timeouts for external API requests (PayPal, AI providers).
- Unhandled network failures, timeouts, and disconnects.

## 10. Finding Format

For each significant finding, provide:

- **Severity:** Critical / High / Medium / Low.
- **Location:** File path and line numbers.
- **Description:** Concise statement of the defect or risk.
- **Impact:** Why it matters to product integrity, security, or user trust.
- **Recommended Fix:** Clear, minimal, and actionable remediation.

## 11. Completion Standard

A review is complete when relevant changes have been examined across the opportunity lifecycle, findings are evidence-based, important risks are prioritized, and recommendations are actionable.

**Final principle:** Review to improve software quality, product trust, and commercial integrity, not to demonstrate personal preferences.
