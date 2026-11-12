---
name: testing-qa
description: Design, implement, execute, and evaluate automated tests, QA strategies, opportunity lifecycle verification, anti-hallucination checks, and regression suites for Opnly.
---

# Testing and QA Skill

## 1. Purpose

Ensure Opnly features are reliable, secure, accessible, functionally correct, and resilient against regression.

Testing must verify real behavior against defined user acceptance criteria across all stages of the Opportunity Lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

## 2. When to Use

Use this skill when:
- Designing test plans for new opportunity features, modules, or APIs.
- Writing unit, integration, and end-to-end tests for backend and frontend.
- Validating AI extraction accuracy, schema compliance, and anti-hallucination behavior.
- Testing commercial proposal negotiations and Deal Room state transitions.
- Testing PayPal order creation, webhook verification, and financial ledger integrity.
- Debugging failing tests or diagnosing regression errors.
- Verifying error handling and ensuring technical jargon is never exposed to users.

## 3. Testing Principles

- **Verify Real Outcomes:** Never consider code tested simply because it compiled or tests passed without assertions. Test expected state transitions, database mutations, and API responses.
- **Isolate Test State:** Keep tests repeatable and independent. Never allow one test's state or database mutations to pollute another.
- **Fail Loudly and Accurately:** When an assertion fails, the error message should explain what requirement was violated.
- **Zero Mocking of Core Logic:** Mock external third-party boundaries (e.g. PayPal REST API, external LLM providers), but never mock away Opnly's own business logic, Decimal arithmetic, or validation layers.

## 4. Opportunity Lifecycle Testing Strategies

### Stage 1 & 2: Idea Capture Studio & AI Business Analyst
- **Sparse Input & Anti-Hallucination:** Test with minimal descriptions. Assert that unmentioned attributes (country, currency, website, budget) remain strictly blank (`""`), never invented.
- **Structured Schema Conformance:** Assert that AI responses parse cleanly into Pydantic models with zero validation errors.
- **Adversarial & Injection Testing:** Feed prompt injection payloads; assert that system instructions are preserved and sensitive system prompts are not leaked.

### Stage 3 & 4: Opportunity Development & Opportunity Press
- **Creator Authority:** Verify that an opportunity cannot be published without explicit creator confirmation.
- **Visibility Permissions:** Test that `PRIVATE` opportunities are never returned in public search queries; verify that `SHARED` opportunities are only visible to authorized Deal Room participants.
- **Redaction of Private Notes:** Ensure internal notes, proprietary details, and unpublished drafts are stripped from public responses.

### Stage 5 & 6: Discovery & Intelligent Matchmaking
- **Explainable Matchmaking:** Assert that every match recommendation includes clear rationale badges explaining compatibility.
- **No False Guarantees:** Ensure match scores are labeled as suggestions rather than guaranteed success probabilities.

### Stage 7 & 8: AI Deal Room & Payments (PayPal)
- **Dual-Party Confirmation:** Test that a proposal cannot transition to `AGREED` until both participating parties have explicitly accepted the terms.
- **Deterministic Arithmetic:** Test currency amounts, milestone fees, and escrow balances using Python `Decimal`. Assert exact precision.
- **PayPal Order Capture:** Mock official PayPal REST API v2 endpoints; verify order creation, capture, and database updates.
- **Webhook Authenticity & Idempotency:** Test cryptographic signature validation; reject invalid signatures with HTTP 400/401; test duplicate webhook delivery to assert idempotency.

### Stage 9: Opportunity Evolution & Commerce Ledger
- **Ledger Auditability:** Assert that every commercial transaction creates an immutable ledger entry linked to the Opportunity ID, Proposal ID, and external PayPal reference.

## 5. Backend Testing Standards (pytest)

- Organize tests logically under `backend/tests/`:
  - `unit/`: Pure domain logic, Pydantic schemas, Decimal financial calculations.
  - `integration/`: API routes (`/api/v1/...`), database CRUD operations, Alembic migrations.
  - `services/`: AI extraction services, PayPal payment workflows, webhook handlers.
- Use pytest fixtures for clean database sessions, rollback-per-test transactions, and authenticated client headers.
- Assert appropriate HTTP status codes:
  - 200/201: Successful operations.
  - 400/422: Malformed inputs and schema validation failures.
  - 401/403: Unauthenticated or unauthorized access (tenant isolation).
  - 404: Non-existent resources.

## 6. Frontend Testing Standards (React Testing Library / Playwright)

- Test user workflows:
  - Entering business descriptions in Idea Capture Studio.
  - Reviewing, editing, and confirming AI suggestions.
  - Verifying that form fields are editable and missing data remains blank.
  - Opening Deal Room proposals and confirming milestones.
- **Error Presentation Verification:** Assert that network errors or API failures display friendly, human-understandable messages and NEVER display raw backend URLs (e.g. `http://127.0.0.1:8000/api/v1`), stack traces, or technical jargon.
- Test keyboard navigation, focus management, and responsive layouts across viewport sizes.

## 7. Test Data Safety & Environment Rules

- Run tests exclusively against local isolated test databases (e.g. SQLite in-memory or a dedicated test PostgreSQL schema).
- **Never drop, wipe, or overwrite development or production databases.**
- Never hardcode real API keys, secrets, or passwords in test files or fixtures.
- Strictly isolate Sandbox credentials from live production; never execute live financial transactions during testing.

## 8. Failure Analysis Workflow

1. Read the full test traceback and isolate the failure point.
2. Determine whether the defect is in implementation code, schema contracts, test assertions, or environment configuration.
3. Fix the underlying root cause without weakening assertions or skipping tests.
4. Rerun the specific failed test to confirm resolution.
5. Run the full test suite to guarantee zero regression.

## 9. Reporting Standard

Always provide:
- Exact test command executed (e.g., `pytest backend/tests/test_onboarding.py -v`).
- Number of passed, failed, and skipped tests.
- Execution environment and test database used.
- Explanation of any tests that could not run.

