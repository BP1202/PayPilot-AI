---
name: Fintech and Payment Standards
description: Project-specific instructions for PayPal integration, payment processing, transaction verification, and financial data integrity.
applyTo: "backend/**/*payment*.py,backend/**/*paypal*.py,backend/**/*transaction*.py,backend/**/*ledger*.py,backend/**/*webhook*.py"
---

# Fintech and Payment Instructions

## 1. Payment Architecture

- Follow the existing payment service architecture.
- Keep payment operations in trusted backend services.
- Use official PayPal documentation as the source of truth.
- Separate sandbox and live environments.
- Keep provider credentials on the backend.
- Avoid introducing unnecessary payment abstractions.

## 2. Financial Accuracy

- Use Python Decimal for monetary calculations.
- Never use floating-point arithmetic as the source of truth for money.
- Validate amounts, currencies, and transaction references.
- Preserve currency precision and rounding rules.
- Never invent financial values or transaction states.
- Keep financial calculations deterministic and testable.

## 3. Payment Authorization

- Require explicit owner approval before consequential payment operations.
- Enforce authorization on the backend.
- Validate the approved amount, currency, recipient, and operation.
- Reject payment requests that differ from approved details.
- Never allow AI-generated recommendations to authorize payments.
- Never treat a frontend interaction as proof of authorization.

## 4. Payment Lifecycle

- Validate payment requests before creating provider operations.
- Track payment states explicitly.
- Distinguish created, approved, captured, failed, and refunded states.
- Verify provider results before updating application records.
- Handle interrupted and partially completed operations safely.
- Do not mark a payment completed without verification.

## 5. PayPal Integration

- Follow documented PayPal API behavior.
- Validate API responses before using them.
- Handle access-token expiration and provider errors.
- Apply request timeouts.
- Protect credentials and access tokens.
- Use sandbox transactions for development and automated testing.
- Never expose private provider credentials to frontend code.

## 6. Webhooks

- Verify webhook authenticity using PayPal's documented process.
- Validate event types and transaction references.
- Handle duplicate and out-of-order events.
- Make webhook processing idempotent.
- Record processed event identifiers where appropriate.
- Never trust an unverified webhook payload.

## 7. Ledger and Transaction Integrity

- Preserve transaction history.
- Use database transactions for related financial updates.
- Prevent duplicate ledger entries.
- Record refunds and reversals as traceable operations.
- Base ledger updates on verified payment events.
- Preserve relevant provider references and audit information.
- Never silently overwrite financial history.

## 8. Security

- Protect credentials and sensitive payment information.
- Follow least-privilege access.
- Validate all payment inputs.
- Prevent replay and duplicate-operation risks.
- Avoid logging sensitive payment data.
- Never store prohibited cardholder information.
- Do not run live transactions without explicit authorization.

## 9. Testing

Test:

- Successful and failed payment operations.
- Invalid amounts and currencies.
- Unauthorized payment attempts.
- Duplicate requests and webhook events.
- Invalid webhook verification.
- Provider timeouts and failures.
- Refund and reversal workflows.
- Transaction and ledger consistency.

Prefer sandbox, mocks, and isolated test data.

## 10. Change Management

- Inspect existing payment workflows before modifications.
- Avoid unrelated financial logic changes.
- Never delete or rewrite transaction history.
- Document important payment state changes.
- Report actual verification and test results.
- Never commit, push, or merge without authorization.