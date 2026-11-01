---
name: secure-coding
description: Apply secure development practices when writing, reviewing, or modifying application code, APIs, authentication, databases, integrations, configuration, and sensitive data workflows.
---

# Secure Coding Skill

## 1. Purpose

Ensure that security is considered throughout the software development lifecycle.

Agents must protect application data, user privacy, credentials, infrastructure, and business operations while keeping implementations practical and maintainable.

Security is a development requirement, not an optional final review.

## 2. When to Use

Use this skill when:

- Creating or modifying APIs and backend services.
- Implementing authentication, authorization, or user sessions.
- Handling credentials, tokens, and environment variables.
- Working with databases and user-supplied input.
- Integrating external APIs, webhooks, or payment providers.
- Processing AI prompts, model responses, or uploaded content.
- Reviewing code for vulnerabilities.
- Deploying applications or modifying infrastructure.

## 3. Secrets and Configuration

- Never hardcode passwords, API keys, tokens, or private credentials.
- Store secrets in environment variables or approved secret-management services.
- Keep `.env` files and private configuration out of version control.
- Maintain `.env.example` with placeholder values only.
- Never print secrets in logs, terminal output, screenshots, or error messages.
- Avoid exposing sensitive configuration through frontend code or public API responses.
- Rotate credentials if they are accidentally exposed.
- Use separate credentials for development, testing, and production.

## 4. Input Validation and Data Handling

- Treat all external input as untrusted.
- Validate request bodies, query parameters, headers, file uploads, and external API responses.
- Use explicit schemas and appropriate data types.
- Apply length limits and sensible constraints.
- Sanitize data where necessary for its output context.
- Use parameterized database queries or safe ORM operations.
- Avoid unsafe deserialization and dynamic code execution.
- Return safe, meaningful validation errors without exposing internal implementation details.

## 5. Authentication and Authorization

- Authenticate users before accessing protected resources.
- Enforce authorization on the server, not only in the frontend.
- Apply least-privilege permissions.
- Verify resource ownership before allowing access or modification.
- Protect sessions and tokens appropriately.
- Never trust client-provided user IDs, roles, or permission claims without verification.
- Avoid exposing private records across users or organizations.

## 6. API and Web Security

- Use HTTPS for production communication.
- Configure CORS for explicitly trusted origins.
- Apply appropriate rate limits to sensitive or expensive endpoints.
- Protect against injection, cross-site scripting, request forgery, and other relevant web vulnerabilities.
- Set safe response headers where appropriate.
- Avoid revealing stack traces or internal infrastructure details to clients.
- Validate third-party API responses before using them.
- Apply timeouts and safe error handling to external requests.

## 7. Database Security

- Use safe ORM operations or parameterized queries.
- Enforce appropriate database permissions.
- Avoid connecting applications with unnecessary administrative privileges.
- Protect sensitive information at rest and in transit.
- Use transactions for operations that require consistency.
- Avoid logging personal or confidential database records.
- Never reset, drop, or overwrite databases without explicit authorization.
- Review migrations for unintended data loss.

## 8. AI and Prompt Security

- Treat user prompts, retrieved documents, uploaded files, and model responses as untrusted.
- Defend against prompt injection and instruction manipulation.
- Never allow model output to directly execute arbitrary shell commands, SQL, or privileged operations.
- Validate structured AI output before application use.
- Restrict tool access to the minimum required permissions.
- Do not send secrets or unnecessary sensitive information to AI providers.
- Require appropriate authorization before AI-triggered actions.
- Keep critical business and financial rules outside the model.

## 9. Payments and Sensitive Actions

For payment-related applications:

- Require explicit user authorization before initiating payments.
- Validate amount, currency, recipient, and transaction context.
- Never trust frontend confirmation as proof of payment.
- Verify provider responses and webhook signatures.
- Apply idempotency protections where supported.
- Prevent duplicate or unauthorized payment execution.
- Protect transaction references and sensitive payment information.
- Distinguish pending, successful, failed, and cancelled states.
- Never use production credentials or real transactions for testing without explicit authorization.

## 10. Dependencies and Infrastructure

- Prefer trusted, maintained dependencies.
- Avoid unnecessary packages and excessive permissions.
- Check package versions and known security advisories when relevant.
- Do not disable security controls merely to make an integration work.
- Use secure defaults in application and infrastructure configuration.
- Avoid exposing database ports or administrative interfaces unnecessarily.
- Keep development and production configurations separate.

## 11. Security Review Workflow

Before completing a security-sensitive task:

1. Identify sensitive data, entry points, and privileged operations.
2. Inspect existing authentication, authorization, and validation.
3. Identify relevant threats and failure scenarios.
4. Implement appropriate protections.
5. Test invalid input, unauthorized access, and failure cases.
6. Review logs, errors, and responses for information leakage.
7. Report remaining risks honestly.

## 12. Security Quality Checklist

- [ ] No hardcoded or exposed secrets.
- [ ] Inputs and external responses are validated.
- [ ] Authentication and authorization are enforced server-side.
- [ ] Database access uses safe operations.
- [ ] Sensitive information is protected.
- [ ] External integrations use secure configuration.
- [ ] AI output cannot bypass application controls.
- [ ] Sensitive actions require appropriate authorization.
- [ ] Errors and logs do not leak confidential information.
- [ ] Relevant security checks have been performed.

## 13. Completion Standard

A security-sensitive change is complete only when relevant protections are implemented and verified.

If a vulnerability cannot be fully addressed, document its impact, remaining exposure, and recommended mitigation.

**Final principle:** Never sacrifice security for convenience, speed, or the appearance of functionality.