---
name: backend-engineering
description: Design, implement, test, and maintain backend services, APIs, business logic, database operations, authentication, and external integrations.
---

# Backend Engineering Skill

## 1. Purpose

Build backend systems that are reliable, secure, maintainable, and scalable enough for their intended use.

The backend should provide consistent business logic, validated data, clear API contracts, and dependable communication between application components.

## 2. When to Use

Use this skill when:

- Creating or modifying backend services and API endpoints.
- Implementing business rules and application workflows.
- Designing database models and relationships.
- Working with authentication and authorization.
- Integrating external APIs and services.
- Implementing background tasks and asynchronous operations.
- Handling errors, transactions, and data consistency.
- Improving backend performance or maintainability.

## 3. Architecture Principles

- Keep responsibilities separated across routes, schemas, services, and data-access layers.
- Keep business logic out of API route handlers where practical.
- Prefer simple, modular, and maintainable architecture.
- Reuse existing services and utilities instead of duplicating logic.
- Avoid unnecessary abstractions and premature optimization.
- Keep frontend, backend, and database responsibilities clearly defined.
- Follow existing project conventions before introducing new patterns.

## 4. API Design

- Use clear and consistent endpoint naming.
- Follow appropriate HTTP methods and status codes.
- Define request and response schemas explicitly.
- Validate incoming data at API boundaries.
- Return predictable response structures.
- Handle errors consistently and safely.
- Document important API behavior and expected inputs.
- Avoid exposing internal implementation details.

Design APIs around application capabilities and user workflows rather than individual database tables.

## 5. Business Logic

- Keep important business rules in dedicated, testable functions or services.
- Avoid duplicating calculations across endpoints.
- Validate business constraints before performing operations.
- Separate calculations, decisions, and external side effects.
- Use deterministic logic for financial calculations.
- Handle invalid states and edge cases explicitly.
- Keep important operations traceable.

Business logic must not depend on unvalidated frontend or AI-generated values.

## 6. Database Engineering

- Use appropriate models, relationships, and constraints.
- Follow the project's ORM and migration conventions.
- Use transactions when related changes must remain consistent.
- Avoid unnecessary database queries and inefficient loading patterns.
- Apply pagination for potentially large result sets.
- Handle connection failures and transaction errors safely.
- Preserve existing records during schema changes.
- Never reset or delete databases without explicit authorization.

## 7. Authentication and Authorization

- Protect private endpoints.
- Enforce permissions on the backend.
- Verify ownership of requested resources.
- Apply least-privilege access.
- Validate identity and authorization before sensitive operations.
- Avoid trusting client-provided roles or ownership claims.
- Handle expired or invalid credentials safely.

## 8. External Integrations

- Use official documentation and supported SDKs or APIs.
- Keep integration credentials in secure configuration.
- Apply request timeouts and appropriate error handling.
- Validate external responses before processing them.
- Handle rate limits and temporary failures.
- Avoid exposing provider errors or secrets to clients.
- Keep external integrations isolated behind dedicated service modules where practical.

## 9. Async Operations and Reliability

- Use asynchronous execution when it provides practical benefits.
- Avoid blocking the event loop in asynchronous applications.
- Handle timeouts, cancellation, and unexpected failures.
- Use retries only when the operation is safe to retry.
- Apply idempotency protections to important operations.
- Avoid duplicate processing of requests and events.
- Keep long-running work outside request handlers when appropriate.

## 10. Logging and Observability

- Use structured and meaningful logs.
- Include useful context for debugging.
- Never log credentials, access tokens, or sensitive personal information.
- Avoid silently swallowing exceptions.
- Distinguish expected application errors from unexpected failures.
- Provide health checks for important services.
- Make operational failures diagnosable without exposing internal details.

## 11. Testing

- Test service logic independently of API routes.
- Test API success and failure responses.
- Validate database behavior and transaction handling.
- Test authorization and invalid inputs.
- Mock external services when appropriate.
- Include integration tests for important workflows.
- Test financial calculations with known expected results.
- Never claim integration success based only on mocked responses.

## 12. Backend Development Workflow

1. Understand the requested behavior and acceptance criteria.
2. Inspect existing routes, services, schemas, and database models.
3. Identify affected API contracts and data dependencies.
4. Plan the smallest maintainable implementation.
5. Implement validation, business logic, and error handling.
6. Add or update relevant tests.
7. Run tests and inspect the final changes.
8. Document meaningful API or schema changes.

## 13. Quality Checklist

- [ ] API contracts are clear and consistent.
- [ ] Inputs and external responses are validated.
- [ ] Business logic is separated and testable.
- [ ] Database changes preserve data integrity.
- [ ] Authentication and authorization are enforced.
- [ ] External integrations handle failures safely.
- [ ] Sensitive information is not exposed.
- [ ] Important operations are safe against duplication.
- [ ] Relevant automated tests pass.
- [ ] Documentation reflects actual behavior.

## 14. Completion Standard

Backend work is complete when the requested behavior is implemented, relevant tests are executed successfully, data integrity is protected, and important failure cases are handled.

**Final principle:** Build backend systems that remain predictable, secure, and maintainable—not merely endpoints that return successful responses.