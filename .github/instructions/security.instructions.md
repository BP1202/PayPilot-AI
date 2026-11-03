---
name: Security Standards
description: Security requirements for application code, APIs, authentication, idea confidentiality, publication visibility, databases, AI safety, secrets, and financial operations.
applyTo: "**/*.{py,ts,tsx,js,jsx,json,yml,yaml}"
---

# Security Instructions

## 1. Core Principles & Opportunity Confidentiality

PayPilot AI is an **AI-powered Idea-to-Business Opportunity Network**.

Core security commitments:
- **Idea Confidentiality & Creator Control:** A creator's ideas, internal notes, financial models, and intellectual property belong strictly to them. Ideas must never be leaked across tenant boundaries or exposed publicly without explicit creator consent.
- **Granular Publication Visibility:** Enforce three distinct visibility states at the database and API layer:
  - `PRIVATE`: Accessible only to the creator and authorized team members.
  - `SHARED`: Accessible only to invited collaborators in an active AI Deal Room under agreed terms.
  - `PUBLIC`: Published via Opportunity Press and discoverable on the Opportunity Network.
- **Human-in-the-Loop Authority:** Explicit human authorization is required before:
  - Transitioning an opportunity from private to public.
  - Sharing private notes or proprietary attachments.
  - Accepting legally binding commercial agreements or milestones.
  - Initiating or capturing financial transactions.

## 2. Authentication, Authorization & Tenant Isolation

- Verify identity on every protected endpoint; never trust client-provided claims without validating backend session tokens/JWTs.
- Strictly enforce user isolation: every database query for opportunities, business profiles, proposals, and transactions must scope by `user_id` or verified collaborator role.
- Prevent IDOR (Insecure Direct Object Reference) vulnerabilities on opportunity IDs and proposal documents.
- Distinguish creator privileges from collaborator, viewer, and network participant permissions.

## 3. Secrets and Configuration Management

- **Zero Secrets in Git:** Never hardcode API keys, database credentials, JWT secrets, or payment credentials in source files.
- Load all sensitive configurations from backend environment variables (`.env`, securely managed).
- Ensure `.env` is listed in `.gitignore` and never committed.
- Keep payment and AI secrets strictly on the backend; never bundle `PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` into frontend assets.
- If a secret is ever accidentally exposed, report it immediately for revocation and rotation.

## 4. API and Input Security

- Validate and sanitize all incoming payloads using Pydantic (backend) and Zod/TypeScript (frontend).
- Prevent injection attacks: use parameterized SQLAlchemy queries (zero raw SQL string concatenation) and sanitize user HTML to prevent XSS.
- Configure CORS strictly to allow only authorized frontend origins in production; do not leave open wildcards (`*`) for credentialed routes.
- **Error Information Disclosure:** Never return internal API endpoints, backend server IP/ports (e.g., `http://127.0.0.1:8000`), Python stack traces, or database schema details in user-facing error responses.

## 5. AI Security and Prompt Integrity

- Treat all user-submitted opportunity descriptions, notes, and uploaded documents as untrusted inputs.
- Guard against direct and indirect prompt injection attempts that attempt to override system instructions or extract confidential prompt templates.
- Enforce tool calling permissions outside the model; AI agents must never possess execution privileges for destructive database operations or unapproved payments.
- Respect privacy with external AI providers: send only necessary sanitized text, never pass API keys, passwords, or unrelated tenant data in prompts.

## 6. Financial and Payment Security (PayPal)

- Manage PayPal operations exclusively from trusted backend services using official REST API v2 endpoints.
- Authenticate incoming PayPal webhooks by cryptographically verifying signatures using PayPal certificates (`paypal-auth-algo`, `paypal-transmission-sig`).
- Enforce idempotency on payments and webhook processing to prevent double-charges and replay attacks.
- Never store prohibited cardholder data (PAN, CVV, PIN).
- Never execute live financial transactions or use live credentials during testing or development.

## 7. Logging, Auditing & Error Handling

- Audit consequential actions: publishing opportunities, accepting proposals, signing agreements, and processing transactions.
- Redact passwords, tokens, API keys, and financial account numbers from logs and monitoring tools.
- Deliver clear, empathetic, non-technical error messages to users without disclosing internal system architecture.

## 8. Security Verification Checklist

Before completing security-sensitive code changes:
1. Verify tenant isolation (`user_id` check on all queries).
2. Confirm publication visibility rules are enforced.
3. Verify that all secrets remain in environment variables.
4. Ensure error responses contain no technical URLs or stack traces.
5. Verify PayPal webhook signature checking and idempotency.
6. Run automated security and regression test suites.
