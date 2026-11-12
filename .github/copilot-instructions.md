# GitHub Copilot Instructions — Opnly

## 1. Source of Truth

Before making changes, read the repository-root `AGENTS.md`.

`AGENTS.md` is the authoritative source for Opnly's product vision, architecture principles, security requirements, payment rules, engineering standards and definition of done.

If instructions conflict, follow `AGENTS.md` and flag the conflict rather than silently choosing a different direction.

## 2. Product Context

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

It helps people transform ideas and real-world business problems into structured opportunities, publish them, discover relevant participants, form collaborations, prepare commercial agreements and progress toward real businesses.

The core journey is:

**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

Every feature and technical decision should support this journey. Do not turn Opnly into a generic business dashboard, freelance marketplace, social network or unrestricted payment platform.

## 3. Agent and Skill Selection

Use the most relevant specialist agent and skill for the task. Read their instructions before starting substantial work.

Available specialist agents:

- `architect.agent.md` — architecture, system boundaries and technical decisions.
- `frontend-engineer.agent.md` — UI, UX and frontend implementation.
- `backend-engineer.agent.md` — APIs, services, database and backend logic.
- `ai-engineer.agent.md` — AI capabilities, orchestration and model integration.
- `fintech-engineer.agent.md` — PayPal, payments and financial workflows.
- `security-reviewer.agent.md` — security, privacy, permissions and threat analysis.
- `qa-engineer.agent.md` — testing and quality assurance.
- `code-reviewer.agent.md` — implementation review and maintainability.

Available skills are under `.github/skills/`. Select the relevant skills for the task; do not load every skill unnecessarily.

Use a small number of specialists with clear responsibilities. Do not create an agent swarm for ordinary tasks.

## 4. Product and AI Requirements

- Keep the opportunity as the central product entity and maintain consistent context across its lifecycle.
- Distinguish user-provided facts, AI-generated suggestions, assumptions and independently verified information.
- Do not invent customers, market demand, financial results, investors or validation.
- Keep creators in control of publication and confidential information sharing.
- Require human approval for consequential commercial actions.
- Use deterministic backend services for financial calculations, permissions and transaction state.
- Treat AI recommendations as assistance, not authoritative financial or legal decisions.

## 5. PayPal and Payment Requirements

- Use official PayPal APIs and supported SDKs.
- Keep credentials and payment operations on the backend.
- Verify webhooks and never trust client-submitted payment status.
- Use explicit user approval before payment execution.
- Record verified transaction outcomes and handle retries safely.
- Clearly identify Sandbox versus live behavior.
- Verify country, currency, product and account eligibility before implementing or claiming support.

Never simulate a successful payment while presenting it as a real PayPal transaction.

## 6. Engineering Workflow

Before implementation:

1. Read `AGENTS.md` and relevant specialist instructions.
2. Inspect the existing implementation and repository structure.
3. Understand the task, dependencies and potential impact.
4. Identify the smallest appropriate change.
5. Preserve existing working behavior and unrelated user changes.

During implementation:

- Follow the existing stack and architectural conventions.
- Prefer modular, typed and testable code.
- Validate data at system boundaries.
- Keep secrets out of source control.
- Use migrations for database schema changes.
- Add or update relevant tests.
- Avoid unnecessary dependencies and unrelated refactoring.

After implementation:

1. Run relevant tests, linting and type checks.
2. Verify the affected workflow.
3. Review the final diff for unintended changes.
4. Update documentation where needed.
5. Report what changed, what was tested and what remains incomplete.

## 7. Repository and Git Safety

- Never discard, overwrite, reset or revert unrelated user changes.
- Inspect `git status` before modifying files or performing Git operations.
- Do not commit, push, merge, rebase or amend commits unless explicitly requested.
- Do not expose credentials, tokens or private business information in logs or documentation.
- Do not claim that an integration or test works unless it has actually been verified.

## 8. Completion Standard

A task is complete only when it satisfies the relevant requirements in `AGENTS.md`, preserves existing functionality, has appropriate tests and validation, and reports limitations honestly.

**Guiding principle:** Build Opnly as a trustworthy path from ideas to real commercial outcomes—not merely as a collection of AI features.