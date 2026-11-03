---
name: secure-coding
description: Apply secure development practices when writing, reviewing, or modifying application code, APIs, authentication, idea confidentiality, publication visibility, databases, PayPal integrations, and sensitive data workflows for PayPilot AI.
---

# Secure Coding Skill

## 1. Purpose

Ensure that security, data privacy, and intellectual property protection are embedded throughout the development lifecycle for PayPilot AI — the AI-powered Idea-to-Business Opportunity Network.

Within PayPilot AI, security encompasses protecting creator ideas, enforcing publication visibility, isolating multi-tenant data, defending against AI injection, and securing financial milestone settlements in the opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

## 2. When to Use

Use this skill when:

- Implementing Opportunity domain models, business profiles, and proposals.
- Creating or modifying backend APIs and FastAPI routers.
- Enforcing idea confidentiality and publication visibility controls (`PRIVATE`, `SHARED`, `PUBLIC`).
- Implementing authentication, authorization, or user sessions.
- Handling credentials, API tokens, and environment variables.
- Integrating official PayPal REST APIs and validating cryptographic webhooks.
- Processing user prompts, AI extraction, or uploaded documents.
- Reviewing code for vulnerabilities and information disclosure.

For overall lifecycle guidance, consult the `opportunity-lifecycle` skill.

## 3. Secrets and Configuration

- **Zero Secrets in Git:** Never hardcode passwords, API keys, JWT secrets, PayPal credentials, or AI tokens in code.
- Store secrets exclusively in backend environment variables (`.env`).
- Never expose backend secrets to client bundles or browser storage.
- Maintain `.env.example` with safe placeholder values only.
- Never print or log secrets in terminal output, logs, or exception traces.
- Rotate credentials immediately if accidentally exposed.

## 4. Opportunity Confidentiality & Publication Visibility

- **Creator Intellectual Property:** A creator's raw ideas, internal notes, financial models, and drafts are confidential by default. They must never be exposed publicly without explicit creator consent.
- **Granular Publication Visibility:** Enforce three distinct visibility states at the database and API layer:
  - `PRIVATE`: Accessible only to the creator and authorized internal collaborators.
  - `SHARED`: Accessible only to invited collaborators in an active AI Deal Room under agreed terms.
  - `PUBLIC`: Published via Opportunity Press and discoverable on the Opportunity Network.
- **Human Authority:** Explicit human authorization is required before:
  - Transitioning an opportunity from private to public.
  - Sharing private notes or proprietary attachments.
  - Accepting legally binding commercial agreements or milestones.
  - Initiating or capturing financial transactions.

## 5. Authentication, Authorization & Tenant Isolation

- Authenticate users on every protected endpoint before granting access.
- Enforce authorization strictly on trusted backend services, not only on the frontend.
- Enforce strict tenant isolation: every database query for opportunities, business profiles, proposals, and transactions must verify ownership (`user_id == current_user.id`).
- Prevent IDOR (Insecure Direct Object Reference) vulnerabilities on opportunity IDs and proposal documents.
- Never trust client-provided user IDs, roles, or permission claims.

## 6. API, Web Security & Error Handling

- Treat all external input as untrusted. Validate request bodies, query params, and headers with Pydantic v2 and TypeScript.
- Prevent SQL injection: use parameterized SQLAlchemy queries and ORM methods (never string formatting for queries).
- Prevent XSS: sanitize user-generated HTML and use React's built-in escaping.
- Configure CORS strictly for trusted origins; do not use open wildcards (`*`) on credentialed routes.
- **No Technical Error Leaks:** Never return internal API endpoints, backend server IP/ports (e.g., `http://127.0.0.1:8000`), Python stack traces, or database schema details in user-facing error responses.

## 7. AI and Prompt Security

- Treat user prompts, notes, and uploaded files as untrusted inputs.
- Defend against prompt injection and instruction manipulation attempts.
- Enforce tool permissions outside the model; AI agents must have zero execution privileges for destructive database updates or unapproved transactions.
- Never send secrets, credentials, or unrelated tenant data in prompts to external AI providers.
- Maintain deterministic application logic for all financial calculations; never let an LLM control financial truth.

## 8. PayPal and Financial Security

- Manage PayPal operations exclusively from trusted backend services using official REST API v2 endpoints.
- Cryptographically verify incoming PayPal webhook notifications using PayPal certificates (`paypal-auth-algo`, `paypal-transmission-sig`).
- Enforce idempotency on payments and webhook processing using unique reference IDs.
- Never store prohibited cardholder data (PAN, CVV, PIN).
- Strictly isolate Sandbox environments from live production; never use live funds during development or testing.

## 9. Security Quality Checklist

- [ ] No hardcoded or exposed secrets.
- [ ] Creator ideas and private notes are protected by visibility controls.
- [ ] Tenant isolation (`user_id`) is enforced on all database queries.
- [ ] Consequential actions require explicit human authorization.
- [ ] Inputs are validated with strict Pydantic schemas.
- [ ] Database access uses safe ORM queries.
- [ ] Error messages are user-friendly and contain no technical URLs or traces.
- [ ] PayPal webhook signatures are verified and idempotent.
- [ ] Automated security and regression tests pass.

## 10. Completion Standard

A security-sensitive change is complete only when relevant protections are implemented, verified, and confirmed to prevent unauthorized access or data leakage.

**Final principle:** Never sacrifice security, user privacy, or creator confidentiality for convenience, speed, or the appearance of functionality.
