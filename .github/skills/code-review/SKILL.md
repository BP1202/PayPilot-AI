---
name: code-review
description: Review code changes for correctness, security, maintainability, performance, architecture compliance, and regressions before approval or release.
---

# Code Review Skill

## 1. Purpose

Ensure code changes are correct, secure, maintainable, and consistent with project requirements.

A code review should identify meaningful problems before they reach users. It should improve software quality without encouraging unnecessary rewrites or subjective feedback.

## 2. When to Use

Use this skill when:

- Reviewing new features or bug fixes.
- Inspecting pull requests and proposed changes.
- Checking AI-generated code.
- Reviewing API, database, and payment implementations.
- Evaluating security and authorization controls.
- Investigating potential regressions.
- Preparing changes for merging or release.

## 3. Review Principles

- Review the actual code and its surrounding context.
- Understand the intended behavior before judging an implementation.
- Prioritize correctness, security, and data integrity.
- Focus on actionable and reproducible issues.
- Distinguish confirmed defects from potential risks.
- Avoid subjective preferences presented as technical problems.
- Do not request unnecessary refactoring.
- Never assume code is correct simply because tests pass.

## 4. Review Priorities

Evaluate findings using these severity levels:

- **Critical:** Serious security vulnerabilities, unauthorized financial actions, data exposure, or major data corruption.
- **High:** Significant functional defects, broken critical workflows, or serious authorization failures.
- **Medium:** Incorrect behavior in specific scenarios, reliability issues, or meaningful maintainability problems.
- **Low:** Minor defects, small improvements, or limited usability concerns.

Prioritize findings by actual impact and likelihood, not by how complicated the code looks.

## 5. Correctness and Logic

Check for:

- Incorrect business rules or calculations.
- Missing validation and boundary conditions.
- Incorrect assumptions about data.
- Unexpected state transitions.
- Missing error handling.
- Incorrect API request or response handling.
- Race conditions and concurrency problems.
- Duplicate operations and inconsistent records.
- Incomplete implementation of acceptance criteria.

Verify whether the implementation solves the actual requested problem.

## 6. Security Review

Inspect for:

- Hardcoded or exposed secrets.
- Missing authentication or authorization.
- Unsafe input handling and injection vulnerabilities.
- Sensitive information in logs or error responses.
- Insecure database operations.
- Unsafe external integrations.
- Excessive permissions.
- Prompt injection and unsafe AI tool execution.
- Missing protection for consequential actions.

For payment-related changes, verify authorization, transaction validation, webhook verification, and idempotency safeguards.

## 7. Architecture and Maintainability

Check whether:

- Code follows existing project architecture.
- Responsibilities are appropriately separated.
- Components and services have clear purposes.
- Existing utilities are reused where practical.
- Business logic is not unnecessarily duplicated.
- Dependencies are justified.
- API contracts remain consistent.
- Database changes follow migration conventions.
- Documentation reflects meaningful behavior changes.

Avoid suggesting architectural changes without a clear benefit.

## 8. Performance and Reliability

Review for:

- Unnecessary database queries.
- Inefficient loops and expensive computations.
- Unnecessary frontend rendering.
- Missing pagination for large datasets.
- Blocking operations in asynchronous workflows.
- Missing timeouts for external requests.
- Unsafe retry behavior.
- Resource leaks and unhandled failures.
- Unnecessary dependencies or network calls.

Focus on realistic performance risks rather than premature optimization.

## 9. Testing and Regression Review

- Inspect relevant existing tests.
- Verify that new behavior has appropriate test coverage.
- Check failure and edge-case scenarios.
- Identify important missing regression tests.
- Run relevant tests when possible.
- Verify that changes do not unintentionally break existing behavior.
- Distinguish actual test failures from untested risks.

Never claim a change is verified without executing the relevant checks.

## 10. Review Workflow

1. Understand the task and expected behavior.
2. Inspect the Git diff and changed files.
3. Read surrounding code and related dependencies.
4. Check correctness, security, architecture, and data integrity.
5. Examine test coverage and potential regressions.
6. Reproduce suspected defects when practical.
7. Classify findings by severity.
8. Provide actionable recommendations.
9. Recheck important fixes when requested.

Review the complete change, not just individual lines in isolation.

## 11. Reporting Format

Present findings in priority order.

For each issue, include:

- **Severity:** Critical, High, Medium, or Low.
- **Location:** Relevant file and line number where possible.
- **Problem:** What is wrong.
- **Impact:** Why it matters.
- **Recommendation:** A practical correction.

Separate confirmed findings from suggestions and unresolved concerns.

If no significant issues are found, state that clearly and mention any important verification limitations.

## 12. Review Quality Checklist

- [ ] Requirements and intended behavior are understood.
- [ ] Actual changes and surrounding context are inspected.
- [ ] Business logic and calculations are correct.
- [ ] Security and authorization are reviewed.
- [ ] Database and API consistency are checked.
- [ ] Error handling and reliability are considered.
- [ ] Performance risks are evaluated.
- [ ] Tests and regression risks are reviewed.
- [ ] Findings are actionable and prioritized.
- [ ] Verification limitations are disclosed.

## 13. Completion Standard

A review is complete when meaningful defects and risks have been identified, findings are supported by evidence, and important verification limitations are documented.

Do not approve code merely because it looks clean or compiles successfully.

**Final principle:** Review code to protect users and improve software quality—not to demonstrate how many issues an agent can find.