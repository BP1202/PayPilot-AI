# GitHub Copilot Instructions

## 1. Project Context

This repository contains PayPilot AI, an AI-powered business copilot connecting business intelligence, strategic decisions, and PayPal payment workflows.

Follow the product objectives and technical standards defined in the root `AGENTS.md`.

## 2. Instruction Priority

- Read and follow the root `AGENTS.md` before making changes.
- Follow applicable instructions in `.github/instructions/`.
- Consult relevant reusable skills in `.github/skills/`.
- Use specialist agents in `.github/agents/` when their expertise is needed.
- Respect the user's explicit task scope and authorization.

Do not assume that every coding agent automatically discovers every instruction or skill file. Read relevant files when needed.

## 3. Skill Usage

Select skills based on the task:

- Research and fact verification: `research-verification`
- Security: `secure-coding`
- AI features: `ai-engineering`
- Backend: `backend-engineering`
- Frontend: `frontend-engineering`
- Payments: `fintech-payments`
- Testing: `testing-qa`
- Code review: `code-review`

Read the relevant `SKILL.md` before specialized work.

## 4. Specialist Agent Usage

Use the appropriate custom agent for specialized responsibilities:

- `architect`
- `ai-engineer`
- `backend-engineer`
- `frontend-engineer`
- `fintech-engineer`
- `security-reviewer`
- `qa-engineer`
- `code-reviewer`

For complex tasks, coordinate specialists while maintaining one consistent architecture and implementation plan.

## 5. Engineering Standards

- Inspect existing code before modifying it.
- Reuse established project patterns.
- Prefer small, focused changes.
- Verify unfamiliar APIs and dependencies.
- Do not invent files, functions, configuration, or test results.
- Keep financial calculations deterministic.
- Validate AI outputs before application use.
- Require explicit authorization for consequential financial operations.
- Protect credentials and private business data.

## 6. Development and Verification

Before completing a task:

1. Identify the relevant files and requirements.
2. Make only the necessary changes.
3. Add or update relevant tests.
4. Run appropriate verification commands.
5. Report actual results and unresolved issues.

Never claim a feature works without verification.

## 7. Git and Change Safety

- Follow the repository's branch and pull-request workflow.
- Do not commit, push, merge, or deploy without authorization.
- Do not overwrite unrelated user changes.
- Do not perform destructive database or infrastructure operations without explicit approval.

## 8. Communication

Keep explanations practical and concise.

For implementation tasks, report:

- What changed.
- Which files were affected.
- What tests or checks were executed.
- Actual results.
- Remaining limitations or next steps.