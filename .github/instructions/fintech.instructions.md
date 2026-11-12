---
name: Fintech and Payment Standards
description: Project-specific instructions for PayPal integration, Deal Room milestone settlements, payment processing, transaction verification, and financial data integrity.
applyTo: "backend/**/*payment*.py,backend/**/*paypal*.py,backend/**/*transaction*.py,backend/**/*ledger*.py,backend/**/*webhook*.py,backend/**/*milestone*.py,backend/**/*proposal*.py"
---

# Fintech and Payment Instructions

## 1. Product Context & Opportunity Commercial Settlements

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

Within the opportunity lifecycle (**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**), payments represent the commercial execution stage:
- Transactions settle approved commercial proposals and deliverables agreed upon in the **AI Deal Room**.
- Every transaction maps to a verifiable opportunity milestone, service agreement, or commercial contract.
- The **Payments and Transaction Intelligence** module ensures transparent, auditable, and dispute-resilient milestone payouts.

Payments are not a detached checkout counter; they represent the tangible commercial realization of business opportunities.

## 2. Financial Accuracy & Deterministic Arithmetic

- **Mandatory Decimal Usage:** All currency calculations, fees, milestone allocations, escrow deposits, and refunds must strictly use Python `Decimal`. Floating-point arithmetic (`float`) is strictly prohibited for monetary values.
- **Explicit Currency Codes:** Always specify standard ISO 4217 currency codes (e.g., `USD`, `INR`, `EUR`). Multi-currency exchanges must use deterministic conversion rates recorded at the moment of agreement.
- **Zero Hallucination Policy:** Transaction amounts, balances, fee schedules, and milestone states must be derived deterministically from database records. Never rely on an LLM for monetary truth.

## 3. Human Authorization & Dual-Party Consent

- Explicit user confirmation is strictly mandatory prior to initiating any payment or milestone escrow release.
- For milestone payouts in the AI Deal Room, backend services must verify dual-party authorization:
  - Deliverable marked complete by the provider.
  - Deliverable accepted and release approved by the buyer/funder.
- AI agents may recommend milestone payouts or draft invoices, but have zero authority to initiate or authorize real financial transactions.
- Never trust frontend interactions or client-provided status flags as proof of authorization.

## 4. Official PayPal Integration Standards

- Integrate strictly using official PayPal REST API v2 endpoints (`/v2/checkout/orders`).
- Keep all PayPal credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) securely loaded in backend environment variables. Never expose them to client bundles or browser storage.
- Manage PayPal OAuth2 access tokens on the backend with appropriate caching and refresh before expiration.
- Enforce idempotency on order creation and capture using unique transaction reference IDs (`Opnly-tx-<id>`).
- Always verify order details (amount, currency, status) via server-to-server calls to PayPal before updating application database records.
- Strictly distinguish Sandbox environments (`api-m.sandbox.paypal.com`) from Live production (`api-m.paypal.com`). Never perform real live transactions during automated tests or local development.

## 5. Webhook Signature Verification & Idempotency

- Cryptographically verify incoming PayPal webhook notifications using PayPal's certificate and signature headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`).
- Never trust unauthenticated or self-asserted webhook payloads.
- Ensure all webhook event handlers are strictly idempotent by recording and checking unique event IDs (`event_id` or `transmission_id`).
- Handle out-of-order, delayed, or duplicated webhook events safely without creating duplicate ledger records or double-charging users.

## 6. Commerce Ledger & Transaction Traceability

- Maintain an immutable, append-only Commerce Ledger for all commercial events (commitments, escrow holds, milestone releases, refunds, platform fees).
- Every ledger record must link to:
  - Associated Opportunity ID and Milestone/Proposal ID.
  - Participating User/Entity IDs.
  - Deterministic Amount and ISO Currency Code.
  - Internal Opnly Transaction Reference ID.
  - External Provider Reference ID (PayPal Order ID / Capture ID).
  - Verifiable Status (`PROPOSED`, `AUTHORIZED`, `CAPTURED`, `RELEASED`, `REFUNDED`, `FAILED`).
- Wrap multi-table ledger and milestone updates in explicit database transactions (`async with session.begin()` / `with session.begin()`).

## 7. Security and Compliance

- Never store prohibited cardholder data (PAN, CVV, PIN) in Opnly databases.
- Prevent replay attacks and race conditions on checkout flows through database row locks or optimistic concurrency controls.
- Redact sensitive financial account details from server logs and exception traces.

## 8. Testing & Simulation

- Maintain comprehensive unit and integration tests covering:
  - Milestone settlement calculations with exact Decimal precision.
  - Successful PayPal order creation and capture flows using mocked responses.
  - Webhook signature verification and invalid signature rejection.
  - Duplicate event deduplication and idempotency.
  - Refund and dispute state transitions.
- Label all local mock implementations clearly as simulated.
