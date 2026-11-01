---
name: fintech-payments
description: Design, implement, integrate, test, and review payment workflows, financial operations, payment provider APIs, webhooks, transaction lifecycles, and financial data integrity.
---

# Fintech & Payments Skill

## 1. Purpose

Build secure, reliable, and traceable financial workflows.

Payment operations require stronger correctness and authorization controls than ordinary application features. Every financial action must have a clear owner, purpose, status, and verifiable outcome.

## 2. When to Use

Use this skill when:

- Integrating PayPal or another payment provider.
- Creating, capturing, authorizing, or refunding payments.
- Managing payment orders and transaction records.
- Implementing payment approval workflows.
- Processing payment webhooks.
- Building financial dashboards and transaction ledgers.
- Implementing reconciliation and payment reporting.
- Handling financial errors, retries, and duplicate events.

## 3. Financial Integrity Principles

- Treat financial data as high-integrity application data.
- Never invent balances, transactions, payment statuses, or financial history.
- Use verified records as the source of truth.
- Keep financial calculations deterministic and independently testable.
- Use decimal-safe arithmetic for monetary values; avoid floating-point calculations for money.
- Store currency explicitly using appropriate currency codes.
- Preserve transaction history and auditability.
- Distinguish actual, estimated, projected, and AI-recommended values.

## 4. Payment Lifecycle

Understand and represent payment states explicitly.

A typical payment workflow may include:

1. Payment proposed.
2. User approval requested.
3. Payment approved.
4. Provider order created.
5. Payment authorized or captured, depending on the chosen flow.
6. Provider confirms the outcome.
7. Transaction record updated.
8. Ledger and relevant business insights refreshed.

Not every provider or payment method uses identical states. Follow the actual provider's documented lifecycle.

Never mark a payment completed merely because an order was created or a frontend callback succeeded.

## 5. PayPal Integration

When integrating PayPal:

- Use official PayPal developer documentation.
- Verify supported APIs, SDK versions, and integration requirements.
- Use sandbox credentials during development and testing.
- Keep client secrets exclusively on the backend.
- Use the appropriate OAuth authentication flow.
- Validate order amounts, currency, and purchase context.
- Handle order creation, approval, capture, and errors according to the selected API flow.
- Store relevant provider references for traceability.
- Verify final payment status using trusted provider responses.
- Keep sandbox and production configuration separate.

Do not invent PayPal endpoints, response fields, SDK methods, or transaction behavior.

## 6. Owner Approval and Payment Authorization

Payment execution must remain under authorized user control.

- Clearly explain the proposed payment before approval.
- Display recipient, amount, currency, and relevant context.
- Require explicit approval for consequential payment actions.
- Verify authorization on the backend.
- Do not treat AI recommendations as payment authorization.
- Prevent approval from being reused for a different payment.
- Revalidate important payment details before execution.
- Record the approval and its relationship to the resulting transaction.

An AI agent may prepare or recommend a payment, but it must not bypass application authorization.

## 7. Webhooks and Transaction Verification

Webhooks are important for reliable payment state updates.

- Verify webhook signatures using the provider's documented procedure.
- Validate event types and relevant identifiers.
- Process events idempotently.
- Handle duplicate, delayed, and out-of-order events.
- Avoid trusting unverified webhook payloads.
- Reconcile important events with provider transaction details where appropriate.
- Record processing outcomes for troubleshooting.
- Return appropriate responses according to provider requirements.

Never update a transaction to a successful state based solely on an unverified event.

## 8. Idempotency, Retries, and Failure Handling

Payment operations must be protected against accidental duplication.

- Use provider-supported idempotency mechanisms where available.
- Maintain application-level safeguards against duplicate execution.
- Use stable identifiers to correlate requests and transactions.
- Retry only when the operation and provider behavior make it safe.
- Handle timeouts where the final provider outcome may be unknown.
- Verify transaction status before attempting another execution.
- Distinguish failed operations from uncertain outcomes.
- Never blindly repeat a capture, refund, or other consequential action.

## 9. Ledger and Reconciliation

- Keep an auditable record of financial events.
- Preserve provider transaction references.
- Record relevant timestamps, currencies, amounts, and statuses.
- Avoid silently overwriting financial history.
- Make corrections traceable.
- Reconcile application records with provider records.
- Detect duplicate, missing, or inconsistent transactions.
- Keep derived balances separate from the underlying transaction history.

A ledger entry should reflect a verified financial event, not merely an intended action.

## 10. Refunds, Disputes, and Exceptions

Where supported by the provider and product requirements:

- Handle refunds as distinct financial operations.
- Preserve links between original payments and refunds.
- Track partial and full refunds appropriately.
- Represent disputes and chargebacks accurately.
- Handle cancellations and reversals without erasing history.
- Communicate unresolved payment outcomes clearly.
- Avoid claiming that a refund or reversal is complete without verification.

## 11. Security and Compliance Awareness

- Protect payment credentials and sensitive transaction information.
- Follow provider security requirements.
- Minimize exposure of personal and payment data.
- Apply authentication and authorization to payment endpoints.
- Avoid storing sensitive payment credentials unnecessarily.
- Never log secrets or unnecessary sensitive payment data.
- Follow applicable provider requirements and relevant legal obligations.
- Do not claim regulatory compliance without an appropriate assessment.

## 12. Testing and Validation

Use sandbox environments and controlled test scenarios.

Test:

- Successful payment workflows.
- User cancellation and declined payments.
- Invalid amounts, currencies, and recipients.
- Unauthorized payment attempts.
- Duplicate requests and webhook events.
- Delayed or out-of-order webhook delivery.
- Provider timeouts and temporary failures.
- Unknown transaction outcomes.
- Refund and reconciliation behavior where implemented.

Use mocks for isolated tests, but verify important integration behavior against the actual sandbox.

Never use real payment credentials or initiate live transactions without explicit authorization.

## 13. Payment Engineering Workflow

1. Define the financial operation and expected lifecycle.
2. Inspect provider documentation and existing payment architecture.
3. Identify authorization, security, and data-integrity requirements.
4. Design transaction states and traceable identifiers.
5. Implement the provider integration and backend controls.
6. Add webhook verification and idempotency safeguards.
7. Test success, failure, retry, and duplicate-event scenarios.
8. Verify transaction records and ledger consistency.
9. Document limitations and report actual test results.

## 14. Quality Checklist

- [ ] Provider behavior matches official documentation.
- [ ] Sandbox and production credentials are separated.
- [ ] Payment amounts and currencies are validated.
- [ ] Monetary calculations use safe arithmetic.
- [ ] Owner authorization is enforced server-side.
- [ ] AI cannot independently authorize payments.
- [ ] Payment states reflect verified outcomes.
- [ ] Webhooks are authenticated and idempotent.
- [ ] Duplicate execution is prevented.
- [ ] Transaction history is traceable.
- [ ] Failure and uncertain outcomes are handled.
- [ ] Relevant sandbox tests have been performed.

## 15. Completion Standard

A payment feature is complete only when its authorization, execution, verification, error handling, and transaction-recording behavior have been implemented and tested appropriately.

**Final principle:** A payment is not successful because the application says so. It is successful only when the payment provider's verified outcome supports that conclusion.