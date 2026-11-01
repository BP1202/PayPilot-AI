---
name: Testing and QA Standards
description: Project-specific instructions for automated testing, quality assurance, regression testing, and application verification.
applyTo: "**/*test*.*,**/*spec*.*,backend/tests/**/*.py,frontend/tests/**/*"
---

# Testing and QA Instructions

## 1. Testing Principles

- Test actual behavior against requirements.
- Cover success, failure, and boundary conditions.
- Prefer deterministic and repeatable tests.
- Keep tests isolated and maintainable.
- Avoid unnecessary duplication.
- Never claim tests passed unless they actually ran successfully.

## 2. Backend Testing

- Use pytest for Python backend tests.
- Test API endpoints, schemas, and business logic.
- Validate input errors and response behavior.
- Test database operations and transaction rollbacks.
- Test authentication and authorization.
- Cover external integration failures.
- Use fixtures and isolated test data.

## 3. Frontend Testing

- Test component rendering and interactions.
- Validate form behavior and input handling.
- Test API success and failure states.
- Check loading, empty, and error states.
- Verify responsive behavior.
- Use Playwright for important end-to-end workflows.

## 4. AI Testing

- Test normal, incomplete, and ambiguous inputs.
- Validate structured model responses.
- Check unsupported claims and hallucinations.
- Test missing or conflicting business data.
- Test prompt injection attempts.
- Verify tool permissions and restrictions.
- Test provider timeouts and failures.
- Maintain regression cases for important AI behavior.

## 5. Financial and Payment Testing

- Test monetary calculations and rounding.
- Validate payment authorization.
- Test successful and failed payment operations.
- Check duplicate requests and idempotency.
- Test webhook verification and duplicate events.
- Verify transaction and ledger consistency.
- Test refunds and failure recovery.
- Never initiate live payments during routine testing.

## 6. Test Data Safety

- Use synthetic or isolated test data.
- Never expose secrets in test output.
- Do not use production financial data for routine testing.
- Avoid destructive operations against shared databases.
- Do not reset database volumes without explicit authorization.
- Use mocks or sandbox environments for external services where practical.

## 7. Failure Analysis

When a test fails:

1. Read the complete error output.
2. Identify the failing test and affected component.
3. Reproduce the failure where practical.
4. Determine whether the cause is code, configuration, environment, or test data.
5. Recommend or implement a focused fix.
6. Rerun the failed test.
7. Run relevant regression tests.

Do not hide failures by weakening assertions or skipping tests without explanation.

## 8. Verification and Reporting

Report:

- Tests executed.
- Commands and relevant environments.
- Passed, failed, and skipped counts.
- Important failures and their causes.
- Tests that could not run and why.
- Remaining unverified scenarios.

Distinguish automated test results from manual inspection.

## 9. Change Management

- Add or update tests when behavior changes.
- Preserve meaningful existing assertions.
- Avoid unrelated test modifications.
- Verify fixes before reporting completion.
- Never fabricate test output or coverage.
- Never commit or push without authorization.

## 10. Completion Standard

A testing task is complete when relevant acceptance criteria have been verified, failures have been investigated, and actual test results and limitations have been documented.