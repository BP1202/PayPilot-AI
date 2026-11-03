---
name: Backend Engineering Standards
description: Project-specific instructions for Python, FastAPI, SQLAlchemy, opportunity domain models, database operations, PayPal fintech integrations, and backend APIs.
applyTo: "backend/**/*.py"
---

# Backend Engineering Instructions

## 1. Product Context & Opportunity-Centric Architecture

PayPilot AI is an **AI-powered Idea-to-Business Opportunity Network**.

The backend architecture revolves around the opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

Core domain models and entities:
- **Opportunity:** The primary entity containing creator ownership, title, problem statement, solution concept, market scope, and lifecycle stage (`DRAFT`, `ANALYSED`, `PUBLISHED`, `MATCHING`, `NEGOTIATING`, `TRANSACTING`, `GROWING`, `COMPLETED`, `ARCHIVED`).
- **OpportunityProfile / BusinessProfile:** Structured business and opportunity attributes (industry, country, business model, currency, required skills/resources).
- **Proposal & Deal Room Agreement:** Terms, milestone breakdowns, deliverable criteria, and dual-party confirmation states.
- **Transaction & Commerce Ledger:** Immutable record of financial events, milestone escrow releases, and PayPal payment references.

Keep service boundaries clear. Prevent PayPilot from becoming an unstructured general-purpose marketplace or a generic CRM.

## 2. Python and FastAPI Standards

- Maintain strict Python type hints and Pydantic v2 schemas for all request/response models.
- Structure endpoints RESTfully under `/api/v1/...` (e.g., `/api/v1/opportunities`, `/api/v1/proposals`, `/api/v1/business-profiles`, `/api/v1/transactions`).
- Separate concerns: Routers (HTTP parsing/auth) → Services (domain & business logic) → Repositories/CRUD (database access) → Models (SQLAlchemy entities).
- Keep API responses consistent and user-friendly. Return clear error structures without leaking stack traces or internal server details.

## 3. Database Integrity & SQLAlchemy

- Use SQLAlchemy 2.0+ declarative models with explicit column types, foreign key relationships, and indexes.
- Manage all schema modifications through Alembic migrations (`alembic revision --autogenerate`).
- **Strictly prohibit dropping or overwriting existing databases or volumes.** Preserve user data and historical records.
- Use explicit database transactions (`async with session.begin()` / `with session.begin()`) for multi-step updates, especially proposal acceptances and financial transactions.
- Implement strict tenant and user isolation: every read and write must verify ownership (`user_id == current_user.id` or explicit collaboration permissions).

## 4. Opportunity Visibility & Security

- Enforce three explicit publication visibility tiers:
  - `PRIVATE`: Accessible only to the creator and authorized collaborators. Private notes and internal cost models remain hidden.
  - `SHARED`: Accessible to invited Deal Room participants under agreed terms.
  - `PUBLIC`: Published through Opportunity Press and discoverable on the Opportunity Network.
- Never expose private opportunity data or creator contact info in public network queries.
- Sanitize and validate all incoming search and extraction queries against SQL injection, XSS, and command injection.

## 5. Commercial Transactions & PayPal Integration

- Model payments as verified settlements of approved Deal Room milestones.
- **Deterministic Arithmetic:** Always use Python `Decimal` for currency amounts, balances, fee calculations, and milestone sums. Never use binary floats or LLM arithmetic.
- Authenticate PayPal integration using official REST API v2 endpoints via backend credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
- Enforce idempotency on order creation and capture using unique transaction reference IDs (`PayPilot-tx-<id>`).
- Verify PayPal webhook signatures cryptographically before updating transaction states.
- Never accept frontend payment events as authoritative proof; only server-to-server capture confirms payment.
- Strictly isolate Sandbox testing credentials from live production environments.

## 6. AI Integration from the Backend

- Expose typed extraction endpoints that return structured opportunity schemas.
- Enforce the zero-invention rule: unmentioned or ambiguous attributes must be returned as empty strings (`""`), never fabricated.
- Provide distinct fields for user inputs, verified facts, AI hypotheses, and recommendations.
- Keep AI prompts and providers behind cleanly defined service abstractions with configurable timeouts and rate-limit handling.

## 7. Error Handling & API Responses

- Format error responses empathetically and cleanly for human consumption.
- Never return raw Python exception tracebacks or internal connection URLs (e.g. `http://127.0.0.1:8000/api/v1`) to the client.
- Handle database connection loss, validation errors, and third-party API downtimes gracefully with appropriate HTTP status codes (400, 401, 403, 404, 422, 503).

## 8. Testing & Verification

- Write automated tests (`pytest`) covering:
  - Opportunity creation, editing, and status transitions.
  - User authorization and visibility isolation.
  - Proposal negotiation states and dual-party confirmation.
  - Deterministic financial ledger calculations and milestone releases.
  - PayPal webhook verification and idempotency handling.
- Run tests against a clean, isolated test database or SQLite in-memory instance.
- Never claim tests passed without executing them and verifying the output.
