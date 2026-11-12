---
name: backend-engineering
description: Design, implement, test, and maintain backend services, APIs, opportunity domain logic, database operations, authentication, and external integrations for Opnly.
---

# Backend Engineering Skill

## 1. Purpose

Build backend systems for Opnly — the AI-powered Idea-to-Business Opportunity Network — that are reliable, secure, maintainable, and aligned with the 9-stage opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

The backend must provide consistent domain logic, validated schemas, strict tenant isolation, clean non-technical error handling, and dependable communication between services.

## 2. When to Use

Use this skill when:

- Implementing or updating Opportunity domain models, proposals, milestones, and transactions.
- Creating or modifying backend services and REST API endpoints under `/api/v1/...`.
- Implementing business rules, opportunity status transitions, and Deal Room agreements.
- Designing PostgreSQL database models, relationships, and Alembic migrations.
- Working with user authentication, tenant isolation, and publication visibility controls.
- Integrating official PayPal REST APIs and verifying cryptographic webhooks.
- Implementing AI extraction endpoints with anti-hallucination validation.
- Handling database transactions, idempotency, and ledger consistency.

For overall lifecycle and module guidance, consult the `opportunity-lifecycle` skill.

## 3. Architecture Principles

- Align services with Opnly's 8 core modules: Idea Capture Studio, AI Business Analyst, Opportunity Press, Opportunity Discovery Network, Intelligent Matchmaking, AI Deal Room, Payments & Transaction Intelligence, and Opportunity Evolution.
- Keep responsibilities separated across routes, schemas, services, and data-access layers.
- Keep domain and business logic out of API route handlers.
- Prefer simple, modular, and maintainable architecture.
- Reuse existing services and utilities instead of duplicating logic.
- Avoid unnecessary abstractions and premature optimization.
- Enforce strict user isolation: every database query must verify ownership (`user_id`).
- Return clean, user-friendly error responses; never expose raw tracebacks or internal service URLs (e.g. `http://127.0.0.1:8000/api/v1`).

## 4. API Design

- Use clear and consistent RESTful endpoint naming under `/api/v1/...`.
- Follow appropriate HTTP methods and status codes.
- Define request and response schemas explicitly with Pydantic v2.
- Validate incoming data at API boundaries.
- Return predictable response structures.
- Handle errors consistently and safely without disclosing internal system architecture.
- Document important API behavior and expected inputs.

Design APIs around opportunity workflows rather than bare database tables.

## 5. Business Logic

- Keep important business rules in dedicated, testable functions or services.
- Avoid duplicating calculations across endpoints.
- Validate business constraints before performing operations.
- Separate calculations, decisions, and external side effects.
- Use deterministic Python `Decimal` logic for all financial calculations; never delegate money to an LLM.
- Handle invalid states and edge cases explicitly.
- Keep important operations traceable in the Commerce Ledger.

Business logic must not depend on unvalidated frontend or AI-generated values.

## 6. Database Engineering

- Use SQLAlchemy 2.0+ declarative models, relationships, and foreign key constraints.
- Follow Alembic migration conventions for all schema evolutions.
- Use transactions when related changes must remain consistent.
- Avoid unnecessary database queries and inefficient loading patterns (N+1 queries).
- Apply pagination for potentially large result sets.
- Handle connection failures and transaction rollbacks safely.
- Preserve existing records during schema changes.
- **Never reset, drop, or delete databases without explicit authorization.**

## 7. Authentication and Authorization

- Protect private endpoints and verify user identity.
- Enforce permissions strictly on the backend.
- Verify ownership of requested opportunities, profiles, proposals, and transactions.
- Enforce publication visibility tiers: `PRIVATE`, `SHARED`, and `PUBLIC`.
- Apply least-privilege access.
- Avoid trusting client-provided roles or ownership claims.

## 8. External Integrations

- Use official documentation and supported SDKs or APIs (e.g. official PayPal REST API v2).
- Keep integration credentials in backend environment variables.
- Apply request timeouts and appropriate error handling.
- Validate external responses before processing them.
- Handle rate limits and temporary failures.
- Avoid exposing provider errors or secrets to clients.
- Keep external integrations isolated behind dedicated service modules.

## 9. Async Operations and Reliability

- Use asynchronous execution when it provides practical benefits.
- Avoid blocking the event loop in asynchronous applications.
- Handle timeouts, cancellation, and unexpected failures.
- Use retries only when the operation is safe to retry.
- Apply idempotency protections to important operations using unique reference IDs.
- Avoid duplicate processing of requests and events.

## 10. Security and Data Protection

- Protect sensitive credentials, private notes, and business information.
- Treat untrusted input safely to prevent SQL injection, XSS, and command injection.
- Redact secrets from logs and error messages.
- Protect ideas and unpublished opportunity drafts from unauthorized access.

## 11. Testing and Verification

- Write unit and integration tests using pytest.
- Test normal cases, boundary values, error scenarios, and authorization rules.
- Test financial calculations with exact Decimal precision.
- Use mocks for external third-party services (PayPal, AI providers).
- Run tests against isolated test databases.

## 12. Backend Engineering Workflow

1. Understand the requirement and affected opportunity lifecycle stage.
2. Inspect relevant files, models, and existing API routes.
3. Plan the service, schema, and database design.
4. Create migrations if database models change.
5. Implement validation, business logic, and error handling.
6. Add or update relevant tests.
7. Run tests and inspect the final changes.
8. Document meaningful API or schema changes.

## 13. Quality Checklist

- [ ] Serves the opportunity lifecycle and defined product requirements.
- [ ] API contracts are typed and consistent.
- [ ] Inputs and external responses are validated with Pydantic.
- [ ] Business logic is separated and testable.
- [ ] Database changes preserve data integrity via Alembic.
- [ ] Authentication, tenant isolation (`user_id`), and visibility are enforced.
- [ ] Error messages are user-friendly and contain no technical URLs or traces.
- [ ] Financial logic uses Python Decimal.
- [ ] Relevant automated tests pass.

## 14. Completion Standard

Backend work is complete when the requested behavior is implemented, relevant tests are executed successfully, data integrity is protected, and important failure cases are handled.

**Final principle:** Build backend systems that remain predictable, secure, and maintainable—not merely endpoints that return successful responses.
