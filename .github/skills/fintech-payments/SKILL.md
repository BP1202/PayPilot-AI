---
name: fintech-payments
description: Design, implement, integrate, test, and review payment workflows, PayPal REST API integrations, Deal Room milestone settlements, webhooks, transaction lifecycles, and financial data integrity for PayPilot AI.
---

# Fintech & Payments Skill

## 1. Purpose

Build secure, reliable, and traceable financial workflows for PayPilot AI — the AI-powered Idea-to-Business Opportunity Network.

Within PayPilot AI, payments represent the commercial settlement stage (**Transact**) of the 9-stage opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

Payment operations settle approved commercial proposals and deliverables agreed upon in the **AI Deal Room**, updating the immutable **Commerce Ledger**. Every financial action must have a clear owner, verified milestone deliverable, deterministic amount, and auditable status.

## 2. When to Use

Use this skill when:

- Implementing or updating the Payments & Transaction Intelligence module.
- Integrating official PayPal REST APIs (Orders v2) for milestone escrows and settlements.
- Creating, capturing, authorizing, or refunding milestone payments.
- Managing payment orders, transaction records, and Commerce Ledger entries.
- Implementing dual-party approval workflows for milestone deliverables.
- Verifying incoming PayPal webhooks cryptographically.
- Building transaction history, milestone receipts, and financial audit trails.
- Enforcing idempotency and preventing duplicate payment submissions.

For overall lifecycle and module guidance, consult the `opportunity-lifecycle` skill.

## 3. Financial Integrity Principles

- Treat financial data as high-integrity application data.
- **Deterministic Arithmetic:** Always use Python `Decimal` for currency amounts, fees, milestone allocations, and balances. Never use floating-point arithmetic or LLM completions for monetary truth.
- Store currency explicitly using ISO 4217 currency codes (e.g., `USD`, `INR`, `EUR`).
- Never invent balances, transactions, payment statuses, or financial history.
- Use verified records as the source of truth.
- Preserve transaction history and auditability in an append-only Commerce Ledger.
- Distinguish actual, estimated, projected, and AI-recommended values.

## 4. Opportunity Payment Lifecycle

Payment workflows settle agreed milestones between Deal Room participants:

1. **Milestone Agreed:** Commercial proposal and milestone terms mutually accepted in the AI Deal Room.
2. **Escrow / Authorization Requested:** User explicitly confirms and initiates payment authorization.
3. **PayPal Order Created:** Backend creates order via official PayPal REST API v2 with unique idempotency key.
4. **User Approves on PayPal:** Payer authorizes payment through secure PayPal checkout.
5. **Backend Server-to-Server Capture:** Backend captures the authorized order and verifies status directly with PayPal.
6. **Webhook Verified:** Cryptographic webhook notification confirms payment settlement.
7. **Commerce Ledger Updated:** Immutable transaction entry created linking Opportunity ID, Milestone ID, and PayPal Capture ID.
8. **Opportunity Evolution Refreshed:** Milestone marked completed, unlocking subsequent opportunity growth stages.

Never mark a payment completed merely because an order was created or a frontend callback succeeded.

## 5. Official PayPal Integration Standards

When integrating PayPal:

- Use official PayPal developer documentation and REST API v2 endpoints (`/v2/checkout/orders`).
- Keep client secrets (`PAYPAL_CLIENT_SECRET`) exclusively on the backend; never bundle into frontend assets.
- Use the appropriate OAuth 2.0 authentication flow with token caching.
- Validate order amounts, currency, and purchase context before submission.
- Store relevant provider references (`order_id`, `capture_id`) for traceability.
- Verify final payment status using trusted provider responses.
- Keep sandbox (`api-m.sandbox.paypal.com`) and production configuration strictly separate.
- Do not invent PayPal endpoints, response fields, SDK methods, or transaction behavior.

## 6. Owner Approval and Payment Authorization

Payment execution must remain under authorized human control:

- Clearly display recipient, milestone deliverable, amount, currency, and fees before requesting approval.
- Require explicit user confirmation for all payment actions.
- Enforce authorization strictly on the backend.
- Do not treat AI recommendations as payment authorization.
- Prevent approval from being reused for a different payment or milestone.
- Revalidate important payment details before execution.
- Record the approval and its relationship to the resulting transaction.

An AI agent may prepare or recommend a milestone settlement, but it must not bypass application authorization.

## 7. Webhooks and Transaction Verification

Webhooks are essential for reliable, asynchronous payment state updates:

- Verify webhook signatures cryptographically using PayPal's public certificates (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-sig`).
- Validate event types and relevant transaction identifiers.
- Process events idempotently by tracking and deduplicating unique event IDs.
- Handle duplicate, delayed, and out-of-order events safely.
- Never trust an unverified or self-asserted webhook payload.
- Return appropriate HTTP 200 responses to acknowledge receipt.

Never update a transaction to a successful state based solely on an unverified event.

## 8. Idempotency, Retries, and Failure Handling

Payment operations must be protected against accidental duplication:

- Use provider-supported idempotency headers (`PayPal-Request-Id`) where available.
- Maintain application-level safeguards against duplicate submission (e.g. database constraints, unique transaction reference IDs).
- Disable submit buttons during active checkout.
- Retry only when the operation and provider behavior make it safe.
- Handle timeouts where the final provider outcome may be temporarily unknown.
- Verify transaction status with PayPal before attempting another execution.
- Distinguish failed operations from uncertain outcomes.
- Never blindly repeat a capture, refund, or other consequential action.

## 9. Commerce Ledger and Auditability

- Keep an append-only, auditable record of all commercial events in the Commerce Ledger.
- Preserve provider transaction references (PayPal Order ID, Capture ID).
- Record exact timestamps, currencies, Decimal amounts, and statuses.
- Avoid silently overwriting financial history.
- Make refunds and corrections traceable linked entries.
- Reconcile application records with provider records.
- Keep derived balances separate from the underlying transaction history.

A ledger entry must reflect a verified financial event, not merely an intended action.

## 10. Refunds, Disputes, and Exceptions

- Handle refunds as distinct, traceable financial operations linked to the original milestone payment.
- Track partial and full refunds appropriately.
- Represent disputes and chargebacks accurately without erasing transaction history.
- Communicate unresolved payment outcomes clearly to users.
- Never claim that a refund or reversal is complete without verification.

## 11. Security and Compliance

- Protect payment credentials and sensitive transaction information.
- Follow least-privilege access on payment endpoints.
- Never store prohibited cardholder data (PAN, CVV, PIN).
- Never log secrets or sensitive financial information.
- Never perform live transactions or use production credentials during development or automated tests.

## 12. Testing and Validation

Use sandbox environments and controlled test scenarios:

- Test successful milestone payment and capture workflows.
- Test user cancellation and declined payments.
- Test invalid amounts, currencies, and unauthorized attempts.
- Test duplicate requests and webhook events (assert idempotency).
- Test delayed or out-of-order webhook delivery.
- Test cryptographic webhook signature verification.
- Test provider timeouts and error recoveries.
- Test Commerce Ledger consistency and Decimal rounding.

## 13. Quality Checklist

- [ ] Integrates with the opportunity lifecycle and AI Deal Room.
- [ ] Provider behavior matches official PayPal documentation.
- [ ] Sandbox and production credentials are separated.
- [ ] Monetary calculations use Python Decimal.
- [ ] Human authorization is enforced server-side.
- [ ] AI cannot independently authorize payments.
- [ ] Payment states reflect verified outcomes.
- [ ] Webhooks are authenticated and idempotent.
- [ ] Duplicate execution is prevented.
- [ ] Commerce Ledger history is traceable and immutable.
- [ ] Relevant sandbox tests pass.

## 14. Completion Standard

A payment feature is complete only when its authorization, execution, verification, error handling, and transaction-recording behavior have been implemented and tested appropriately against official PayPal standards.

**Final principle:** A payment is not successful because the application says so. It is successful only when the payment provider's verified outcome supports that conclusion.
