---
name: Code Review Standards
description: Project-wide standards for reviewing code changes, identifying defects, evaluating security, and verifying implementation quality.
---

# Code Review Instructions

## 1. Review Principles

- Understand the requirement before reviewing the implementation.
- Inspect changed files and relevant surrounding code.
- Prioritize correctness, security, and reliability.
- Focus on actionable problems, not personal preferences.
- Do not report speculative issues as confirmed defects.
- Avoid unnecessary refactoring recommendations.

## 2. Review Priorities

Classify findings consistently:

- **Critical:** Severe security compromise, financial loss, or major data exposure.
- **High:** Serious functional defects or exploitable vulnerabilities.
- **Medium:** Meaningful reliability, correctness, or maintainability issues.
- **Low:** Minor improvements with limited impact.

Explain the reasoning behind each severity.

## 3. Correctness and Architecture

Check:

- Requirement compliance.
- Logical errors and edge cases.
- Existing functionality and backward compatibility.
- API and database contract consistency.
- Error handling and failure recovery.
- Unnecessary duplication or complexity.
- Appropriate separation of responsibilities.

## 4. Security

Check:

- Exposed secrets and credentials.
- Authentication and authorization.
- Input validation and injection risks.
- Sensitive information disclosure.
- Unsafe external integrations.
- AI prompt injection and tool permissions.
- Database and configuration security.

## 5. AI and Financial Integrity

For AI changes:

- Validate structured model outputs.
- Check data grounding and unsupported claims.
- Verify tool restrictions and authorization boundaries.
- Ensure AI cannot bypass application security.

For payment changes:

- Verify explicit owner approval.
- Check payment amount and currency validation.
- Verify PayPal results and webhook authenticity.
- Check idempotency and duplicate prevention.
- Confirm ledger updates preserve transaction integrity.

## 6. Testing Review

- Check whether relevant tests were added or updated.
- Evaluate success, failure, and boundary scenarios.
- Review assertion quality.
- Identify missing security and financial tests.
- Distinguish tests inspected from tests actually executed.
- Never invent passing test results.

## 7. Performance and Maintainability

Review:

- Unnecessary database queries.
- Inefficient processing.
- Unnecessary network requests.
- Resource handling.
- Excessive dependencies.
- Poorly structured modules.
- Difficult-to-maintain abstractions.

Avoid premature optimization without evidence.

## 8. Finding Format

For each significant finding, provide:

- Severity.
- Affected file and location.
- Description of the issue.
- Why it matters.
- Recommended fix.

Focus on problems that can be addressed.

## 9. Review Workflow

1. Understand the task and acceptance criteria.
2. Inspect the changes and surrounding code.
3. Trace important application and data flows.
4. Review correctness and security.
5. Evaluate testing and failure handling.
6. Verify findings against available evidence.
7. Prioritize issues by severity.
8. Report findings and remaining risks.

## 10. Boundaries

- Do not modify implementation code unless requested.
- Do not rewrite entire files for stylistic preferences.
- Do not expose secrets in review reports.
- Do not run destructive commands or live payment operations.
- Do not approve unverified behavior.
- Do not commit, push, or merge without authorization.

## 11. Completion Standard

A review is complete when relevant changes have been examined, findings are evidence-based, important risks are prioritized, and recommendations are actionable.

**Final principle:** Review for correctness, security, and maintainability—not personal coding preferences.