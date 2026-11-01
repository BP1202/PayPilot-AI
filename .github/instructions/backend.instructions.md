---
name: Backend Engineering Standards
description: Project-specific instructions for Python, FastAPI, SQLAlchemy, database operations, and backend APIs.
applyTo: "backend/**/*.py"
---

# Backend Engineering Instructions

## 1. Architecture

- Follow the existing FastAPI application structure.
- Keep API routes, schemas, services, and database models separated.
- Use dependency injection for shared resources.
- Prefer small, focused, reusable modules.
- Inspect existing implementations before introducing new patterns.

## 2. Python and FastAPI

- Use Python type hints.
- Use Pydantic for request and response validation.
- Follow existing asynchronous and synchronous conventions.
- Use appropriate HTTP methods and status codes.
- Keep API responses consistent.
- Handle expected errors explicitly.

## 3. Database

- Follow SQLAlchemy 2.x conventions.
- Use Alembic for schema migrations.
- Separate database models from API schemas.
- Use transactions for related financial updates.
- Avoid unsafe raw SQL and dynamic query construction.
- Never reset or delete database volumes as a troubleshooting shortcut.

## 4. Security

- Validate all external inputs.
- Enforce authorization in backend services.
- Never expose credentials or sensitive data.
- Load secrets through environment configuration.
- Do not trust frontend validation as a security boundary.
- Apply least-privilege access.

## 5. Financial Integrity

- Use Decimal for monetary calculations.
- Keep financial calculations deterministic.
- Validate amounts and currencies.
- Prevent duplicate financial operations.
- Verify external payment results before updating records.
- Preserve transaction history and audit information.
- Never allow AI output to authorize payments.

## 6. External Integrations

- Keep external providers behind service boundaries.
- Apply timeouts and appropriate error handling.
- Validate provider responses.
- Avoid exposing provider credentials.
- Use mocks or sandbox environments for tests.

## 7. Testing

- Write tests for new business logic and API behavior.
- Cover success, failure, and boundary cases.
- Test database transaction behavior.
- Test authorization and financial safeguards.
- Use isolated test data.
- Run relevant pytest tests after changes.

## 8. Change Management

- Avoid unrelated modifications.
- Preserve existing API compatibility where practical.
- Update documentation when behavior changes.
- Report files changed and tests actually executed.
- Never commit or push without authorization.