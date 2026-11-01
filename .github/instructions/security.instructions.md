---
name: Security Standards
description: Security requirements for application code, APIs, authentication, databases, AI integrations, secrets, and financial operations.
applyTo: "**/*.{py,ts,tsx,js,jsx,json,yml,yaml}"
---

# Security Instructions

## 1. Core Principles

- Follow least-privilege access.
- Treat all external input as untrusted.
- Apply defense in depth.
- Use secure defaults.
- Enforce security on trusted backend services.
- Never rely on prompts or frontend restrictions as security boundaries.

## 2. Secrets and Configuration

- Never hardcode API keys, passwords, tokens, or credentials.
- Load secrets from environment variables or approved secret managers.
- Never expose backend secrets to frontend code.
- Keep `.env` files out of Git.
- Use `.env.example` with safe placeholders.
- Never print or include actual secrets in logs, reports, or commits.

## 3. Authentication and Authorization

- Verify identity before granting access to protected resources.
- Enforce authorization for every sensitive operation.
- Prevent users from accessing another user's private data.
- Validate permissions on the backend.
- Use established authentication mechanisms.
- Protect sessions and tokens appropriately.

## 4. API and Input Security

- Validate and sanitize untrusted inputs.
- Use parameterized database queries.
- Apply appropriate request limits and rate controls.
- Avoid exposing stack traces or internal implementation details.
- Configure CORS deliberately.
- Validate external API responses before use.

## 5. AI Security

- Treat user prompts and retrieved content as untrusted.
- Defend against direct and indirect prompt injection.
- Restrict AI tool permissions.
- Validate model outputs before application use.
- Enforce authorization outside the model.
- Never expose confidential business data unnecessarily.
- Never allow AI output to independently authorize financial operations.

## 6. Financial and Payment Security

- Keep PayPal credentials on the backend.
- Require explicit owner approval for consequential payment operations.
- Validate approved amounts, currencies, recipients, and operations.
- Verify payment results before updating financial records.
- Authenticate webhook events using documented provider procedures.
- Prevent duplicate and replayed operations.
- Preserve transaction and audit history.
- Never perform live payments without explicit authorization.

## 7. Database and Infrastructure

- Use least-privilege database credentials.
- Protect sensitive records.
- Avoid unsafe SQL and dynamic query construction.
- Keep development and production environments separated.
- Avoid exposing unnecessary ports or services.
- Never perform destructive infrastructure operations without approval.

## 8. Logging and Error Handling

- Never log passwords, tokens, private keys, or sensitive payment data.
- Keep user-facing errors informative but non-revealing.
- Record security-relevant events appropriately.
- Avoid exposing confidential information through exception messages.

## 9. Dependencies

- Prefer established and maintained packages.
- Verify unfamiliar dependencies before installation.
- Review security advisories when relevant.
- Avoid unnecessary dependencies.
- Do not blindly upgrade critical packages.

## 10. Security Verification

Before completing security-sensitive work:

1. Identify trust boundaries and sensitive data.
2. Review authentication and authorization.
3. Validate inputs and external responses.
4. Check secrets and configuration handling.
5. Evaluate failure and abuse scenarios.
6. Add relevant security tests.
7. Report actual verification results and remaining risks.

## 11. Change Management

- Avoid unrelated security configuration changes.
- Do not weaken existing security controls to make tests pass.
- Do not expose secrets while debugging.
- Do not perform destructive security testing without authorization.
- Never claim an application is completely secure.
- Never commit or push without authorization.