---
name: Testing and QA Standards
description: Project-specific instructions for automated testing, opportunity lifecycle QA, anti-hallucination verification, PayPal sandbox tests, and regression suites.
applyTo: "**/*test*.*,**/*spec*.*,backend/tests/**/*.py,frontend/tests/**/*"
---

# Testing and QA Instructions

## 1. Product Context & Opportunity Lifecycle Testing

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

Testing must validate real user journeys across the opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

QA verification covers each lifecycle stage:
1. **Capture:** Raw text/problem inputs correctly parsed into structured drafts.
2. **Understand:** AI Business Analyst outputs conform to Pydantic schemas without fabricating missing information.
3. **Develop:** Opportunities can be enriched with milestone requirements and commercial goals.
4. **Publish:** Opportunity Press transitions from Draft to Published only upon explicit human approval.
5. **Discover:** Opportunity Network search and filtering return relevant opportunities respecting visibility permissions.
6. **Match:** Intelligent matchmaking delivers explainable match rationale badges without asserting guaranteed commercial success.
7. **Negotiate:** Deal Room proposals require mutual approval from both participating parties.
8. **Transact:** Milestone settlements execute via verified PayPal orders with deterministic Decimal accounting and webhook validation.
9. **Grow:** Evolution milestones and transaction histories update the Commerce Ledger accurately.

## 2. Anti-Hallucination & AI Verification

- **Zero Invention Test:** Test extraction with sparse descriptions (e.g. only business name and description). Assert that unprovided attributes (website, country, budget) remain strictly blank (`""`), never filled with hallucinated defaults.
- **Evidence Labeling Test:** Verify that AI responses cleanly separate user-provided facts, AI hypotheses, verified external data, and suggested actions.
- **Prompt Injection Resilience:** Test extraction and advisory endpoints with malicious prompt payloads; verify that system boundaries and private instructions are not breached.
- **Deterministic Financial Fallback:** Assert that all pricing, milestone additions, and balance calculations are performed by Python `Decimal` application code, not LLM completions.

## 3. Backend & API Testing (pytest)

- Test API endpoints under `/api/v1/...` for:
  - Correct HTTP status codes (200, 201, 400, 401, 403, 404, 422).
  - Schema validation on requests and responses.
  - Strict tenant isolation: user A cannot read, modify, or delete user B's private opportunities or proposals.
  - Transaction rollbacks: verify database rollback on failed multi-step operations.
- **Clean Error Responses:** Assert that API error responses contain empathetic, human-readable error messages and never leak Python stack traces, internal database details, or raw server addresses.

## 4. Financial & Payment Testing (PayPal)

- Test payment workflows using mock responses conforming to official PayPal REST API v2 schemas.
- Test monetary arithmetic with edge-case Decimal values (fractional cents, high-precision rounding).
- Test idempotency: sending the same payment capture request or webhook payload multiple times must produce exactly one ledger record.
- Test webhook verification: valid cryptographic signatures succeed; corrupted, forged, or expired signatures are rejected with HTTP 400/401.
- Strictly prohibit executing live payment transactions during routine testing.

## 5. Frontend & UX Testing

- Test forms for:
  - Editable fields for all AI-suggested attributes.
  - Explicit user confirmation before submission (no auto-saving without approval).
  - Clean error states without technical jargon (e.g. no `"Unable to connect to Opnly backend at http://127.0.0.1:8000/api/v1"`).
  - Empty states, loading skeletons, and interactive feedback.
- Test responsive layouts and WCAG accessibility standards across desktop and mobile viewports.

## 6. Test Data Safety & Environment Isolation

- Run automated tests against dedicated test databases or SQLite in-memory fixtures.
- Never drop, wipe, or overwrite development or production databases.
- Never hardcode or log credentials, API keys, or private user data in test fixtures or assertions.
- Keep test executions isolated, deterministic, and repeatable.

## 7. Failure Analysis & Honest Reporting

- When tests fail, diagnose the root cause (code bug, schema mismatch, environment configuration) rather than weakening assertions or skipping tests.
- Always report:
  - Exact command lines executed (e.g., `pytest backend/tests/test_opportunities.py -v`).
  - Total tests passed, failed, and skipped.
  - Clear explanation of any unrun tests and the specific reasons.
- Never claim tests passed unless they were actually executed and returned exit code 0.
