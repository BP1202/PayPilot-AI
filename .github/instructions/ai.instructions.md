---
name: AI Engineering Standards
description: Project-specific instructions for LLM integrations, prompt engineering, structured outputs, AI tools, and business intelligence.
applyTo: "backend/**/*ai*.py,backend/**/*llm*.py,backend/**/*prompt*.py,backend/**/*agent*.py,frontend/**/*ai*.{ts,tsx},frontend/**/*copilot*.{ts,tsx}"
---

# AI Engineering Instructions

## 1. AI Architecture

- Follow the existing AI service architecture.
- Keep model integrations separate from business logic.
- Use clear interfaces for AI providers and services.
- Avoid unnecessary provider abstractions.
- Verify provider capabilities using official documentation.

## 2. Prompt Engineering

- Keep system prompts focused and version-controlled.
- Clearly define the model's role, context, objectives, and limitations.
- Specify expected response formats.
- Include instructions for missing or insufficient information.
- Treat user input and retrieved content as untrusted.
- Never rely on prompts alone for security or authorization.

## 3. Structured Outputs

- Prefer structured responses for application workflows.
- Define and validate output schemas.
- Reject malformed or incomplete responses.
- Handle unexpected fields and invalid values safely.
- Keep user-facing explanations separate from machine-readable data.

## 4. AI and Business Data

- Ground recommendations in available business data.
- Never invent transactions, balances, revenue, expenses, or metrics.
- Distinguish verified figures from estimates and forecasts.
- Identify missing information and assumptions.
- Do not present unsupported recommendations as facts.
- Protect private business information.

## 5. Financial Intelligence

- Use deterministic backend services for financial calculations.
- Never use LLM output as the source of truth for monetary values.
- Validate financial inputs and outputs independently.
- AI may explain or recommend financial decisions.
- AI must never independently authorize or execute payments.
- Require explicit application-level approval for consequential actions.

## 6. Tool Calling

- Give AI tools narrowly defined responsibilities.
- Validate tool arguments before execution.
- Enforce permissions outside the model.
- Validate tool results before using them.
- Prevent unauthorized database, shell, or payment operations.
- Handle repeated calls, timeouts, and failures safely.

## 7. Reliability and Error Handling

- Handle provider outages and rate limits.
- Apply appropriate request timeouts.
- Validate responses before application use.
- Provide useful fallback behavior.
- Avoid unnecessary model calls.
- Do not silently replace failed AI responses with fabricated information.

## 8. Security and Privacy

- Never expose provider API keys.
- Send only necessary data to model providers.
- Treat retrieved documents and user content as untrusted.
- Protect sensitive business information.
- Avoid logging private prompts and responses unnecessarily.
- Do not allow model output to bypass application authorization.

## 9. Testing and Evaluation

Test:

- Normal and incomplete inputs.
- Ambiguous questions.
- Missing or conflicting business data.
- Invalid structured responses.
- Unsupported financial claims.
- Prompt injection attempts.
- Unauthorized tool requests.
- Provider errors and timeouts.
- Response consistency and usefulness.

Maintain regression tests for important AI workflows.

## 10. Change Management

- Inspect existing AI implementations before modifying them.
- Avoid unrelated prompt or architecture changes.
- Document important prompt and schema changes.
- Report model limitations and actual test results.
- Never claim AI accuracy without meaningful evaluation.
- Never commit or push without authorization.