---
name: ai-engineering
description: Design, implement, integrate, and evaluate reliable AI-powered application features, including LLM APIs, prompt engineering, structured outputs, tool calling, retrieval, and AI evaluation.
---

# AI Engineering Skill

## 1. Purpose

Build AI features that are reliable, secure, useful, and aligned with real application requirements.

AI should solve meaningful problems, support decisions, and improve user workflows—not simply generate impressive-looking text.

## 2. When to Use

Use this skill when:

- Integrating LLM providers or AI APIs.
- Designing AI assistants and business copilots.
- Creating system prompts and reusable prompt templates.
- Implementing structured outputs or function calling.
- Connecting AI models to application tools and data.
- Building retrieval-augmented generation (RAG).
- Evaluating model quality, reliability, and performance.
- Debugging inconsistent or incorrect AI responses.

## 3. AI Architecture Principles

- Keep AI responsibilities clearly separated from application business logic.
- Use provider-independent interfaces where they offer practical value.
- Avoid unnecessary abstractions or premature multi-provider architectures.
- Keep prompts, schemas, tools, and model configuration organized.
- Make model selection configurable when appropriate.
- Handle provider failures without breaking the entire application.
- Keep sensitive operations under deterministic application control.

## 4. Prompt Engineering

Create prompts that are specific, consistent, and testable.

- Define the AI's role and objective clearly.
- Provide only relevant context.
- Specify expected response structure and constraints.
- Include important business rules and limitations.
- Explain how the AI should handle missing or insufficient information.
- Avoid contradictory instructions and unnecessary prompt length.
- Keep reusable prompts version-controlled.
- Never rely on prompt instructions alone for security enforcement.

For important workflows, include representative examples and test cases.

## 5. Structured Outputs

Prefer structured responses when AI output is consumed by application logic.

- Define explicit schemas for expected outputs.
- Validate model responses before processing them.
- Check required fields, types, ranges, and allowed values.
- Handle malformed, incomplete, or unexpected responses.
- Reject invalid outputs safely.
- Avoid fragile parsing of free-form text.
- Keep user-facing explanations separate from machine-readable data where appropriate.

A response that looks correct to a person is not automatically valid application data.

## 6. Tool Calling and AI Actions

AI tools must operate within controlled application boundaries.

- Give each tool a clear purpose and limited permissions.
- Validate tool arguments before execution.
- Enforce authorization independently of model decisions.
- Validate tool results before returning them to the model.
- Handle timeouts, failures, and repeated calls safely.
- Prevent unrestricted shell, database, or privileged system access.
- Require human approval for consequential actions.
- Maintain traceability for important tool executions.

The model may recommend an action, but the application decides whether that action is permitted.

## 7. Business Reasoning and Financial Intelligence

For AI-powered business applications:

- Use verified business data as the source of truth.
- Clearly distinguish actual figures, estimates, forecasts, and recommendations.
- Never invent financial records or business metrics.
- Use deterministic code for calculations and financial rules.
- Explain the reasoning behind important recommendations.
- Identify assumptions and missing information.
- Avoid presenting uncertain predictions as guaranteed outcomes.
- Keep recommendations consistent with the user's actual business context.

For PayPilot AI, AI may interpret business performance and recommend strategies, but financial calculations and transaction decisions must remain independently validated.

## 8. Context and Retrieval

When providing context to a model:

- Retrieve relevant information rather than sending unnecessary data.
- Preserve source information and useful references.
- Respect user and organization access permissions.
- Avoid exposing unrelated or confidential records.
- Treat retrieved documents as untrusted content.
- Address outdated, conflicting, and incomplete information.
- Distinguish retrieved facts from model-generated interpretation.

Use RAG only when it provides measurable value over simpler approaches.

## 9. Reliability and Failure Handling

Design AI workflows for imperfect model behavior.

Handle:

- API timeouts and provider outages.
- Rate limits and temporary failures.
- Invalid or incomplete model responses.
- Context-window limitations.
- Tool execution errors.
- Missing business information.
- Conflicting or low-confidence results.

Use appropriate retries, timeouts, fallbacks, and user-facing error messages.

Never retry consequential actions blindly. Prevent duplicate execution.

## 10. AI Evaluation and Testing

Evaluate AI features using representative scenarios.

- Test normal, incomplete, ambiguous, and adversarial inputs.
- Check structured-output validity.
- Verify that recommendations use supplied data correctly.
- Test tool permissions and approval requirements.
- Measure consistency and task success.
- Check failure handling and response quality.
- Evaluate latency and token usage where relevant.
- Maintain regression cases for previously identified failures.

Do not rely only on a few successful demonstrations to claim AI quality.

## 11. Privacy and Responsible AI

- Send only the data necessary for the task.
- Protect credentials, personal information, and confidential business data.
- Avoid logging complete prompts or responses when they contain sensitive information.
- Communicate uncertainty and relevant limitations.
- Avoid fabricated evidence, misleading explanations, and unsupported claims.
- Keep consequential decisions under appropriate human oversight.

## 12. AI Engineering Workflow

1. Define the user problem and expected AI behavior.
2. Inspect the existing architecture and available data.
3. Select an appropriate model and integration approach.
4. Define prompts, schemas, and tool boundaries.
5. Implement validation and failure handling.
6. Test representative and adversarial scenarios.
7. Evaluate quality, reliability, and performance.
8. Document limitations and report verified results.

## 13. Quality Checklist

- [ ] AI solves a clearly defined user problem.
- [ ] Prompts and expected outputs are clearly specified.
- [ ] Structured responses are validated.
- [ ] Tool access is restricted and authorized.
- [ ] Business-critical logic is deterministic.
- [ ] Missing information and uncertainty are handled.
- [ ] Provider failures do not break critical workflows.
- [ ] Sensitive data is appropriately protected.
- [ ] Representative AI evaluation tests exist.
- [ ] Limitations are documented honestly.

## 14. Completion Standard

An AI feature is complete when it produces useful, validated results under expected conditions and handles important failure scenarios safely.

**Final principle:** Build AI that earns user trust through accuracy, transparency, controlled actions, and measurable usefulness.