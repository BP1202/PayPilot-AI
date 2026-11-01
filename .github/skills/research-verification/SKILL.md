---
name: research-verification
description: Research and verify technical information, external documentation, APIs, dependencies, claims, and implementation decisions. Use when an agent needs reliable information before coding, integrating external services, troubleshooting unfamiliar behavior, or evaluating technical approaches.
---

# Research & Verification Skill

## 1. Purpose

Help AI agents make accurate, evidence-based decisions instead of relying on guesses, outdated knowledge, or fabricated technical details.

The objective is not to research everything. It is to find the information necessary to make the current task correct, safe, and maintainable.

## 2. When to Use

Use this skill when:

- Working with unfamiliar frameworks, libraries, SDKs, or tools.
- Integrating third-party APIs or external services.
- Checking current technical documentation or implementation requirements.
- Investigating errors, unexpected behavior, or compatibility issues.
- Comparing technical approaches or dependencies.
- Making security, architecture, or financial-system decisions.
- Verifying claims before including them in project documentation.

For familiar, low-risk tasks, use existing project knowledge and avoid unnecessary research.

## 3. Research Principles

### Prefer reliable sources

Use sources in this order:

1. Official product and developer documentation.
2. Official API references, specifications, and release notes.
3. Official repositories and maintained examples.
4. Recognized technical standards and security guidance.
5. Reputable technical articles and engineering publications.
6. Community discussions when primary sources do not resolve the issue.

Community answers are useful evidence, not automatic proof.

### Verify before implementing

Before relying on external information:

- Check whether the documentation applies to the installed version.
- Confirm that referenced methods, endpoints, and parameters actually exist.
- Check compatibility with the current project architecture.
- Look for deprecations, breaking changes, and known limitations.
- Prefer current documentation over outdated tutorials.

Never assume that an example from another version works in this project.

## 4. Anti-Hallucination Rules

Agents must never:

- Invent API endpoints, package names, SDK methods, or configuration options.
- Fabricate documentation links, technical claims, or test results.
- Present assumptions as verified facts.
- Claim an integration works without testing it.
- Treat AI-generated answers as authoritative technical evidence.
- Hide uncertainty when reliable information is unavailable.

When information is uncertain:

1. Identify exactly what is unknown.
2. Search for reliable evidence.
3. Validate against the installed version or actual implementation.
4. State any remaining uncertainty clearly.
5. Avoid implementing risky assumptions.

## 5. Practical Research Workflow

Follow this sequence:

**Step 1 — Define the question**

Identify the exact technical decision or problem that needs investigation.

**Step 2 — Inspect the project**

Review existing code, configuration, dependencies, documentation, and relevant versions.

**Step 3 — Find reliable evidence**

Consult the most relevant official sources first. Avoid collecting unnecessary references.

**Step 4 — Cross-check**

Confirm important details against another authoritative source, actual package behavior, or a reproducible test when appropriate.

**Step 5 — Apply findings**

Use verified information that fits the current architecture and task requirements.

**Step 6 — Validate**

Run the relevant checks or tests. Documentation alone does not prove the implementation works.

**Step 7 — Report**

Summarize the conclusion, important evidence, implementation implications, and unresolved uncertainties.

## 6. External APIs and Dependencies

When researching an external integration:

- Verify the official API documentation and authentication process.
- Confirm request methods, URLs, headers, parameters, and response schemas.
- Check rate limits, error responses, pagination, and retry behavior where relevant.
- Review webhook verification and security requirements.
- Confirm sandbox versus production behavior.
- Check package maintenance, supported versions, and compatibility.
- Never expose credentials while testing or documenting an integration.

For payment services, prioritize official provider documentation and verify transaction behavior independently.

## 7. Research Notes and Evidence

Keep research proportional to the task.

For significant decisions, record:

- **Question:** What needed verification?
- **Sources:** Which reliable references were consulted?
- **Finding:** What was actually confirmed?
- **Decision:** How does it affect implementation?
- **Uncertainty:** What remains unknown?

Link to sources when useful. Do not add citations merely to make a report look authoritative.

## 8. Research Quality Checklist

Before completing research, verify:

- [ ] The question and scope are clear.
- [ ] Existing project code and versions were inspected.
- [ ] Reliable sources were preferred.
- [ ] Important technical claims were verified.
- [ ] Deprecated or incompatible approaches were avoided.
- [ ] Assumptions and uncertainties are identified.
- [ ] Findings are relevant to the actual task.
- [ ] Implementation claims are supported by practical verification where possible.

## 9. Completion Standard

Research is complete when the agent has enough reliable evidence to make a justified implementation decision—or has clearly explained why the available evidence is insufficient.

Do not confuse more research with better research.

**Final principle:** Verify what matters, cite what you rely on, acknowledge what you do not know, and never turn a guess into a technical fact.