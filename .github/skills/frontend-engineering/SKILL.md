---
name: frontend-engineering
description: Design, implement, test, and maintain responsive, accessible, performant frontend applications, Opportunity lifecycle interfaces, human-in-the-loop forms, and user interactions for PayPilot AI.
---

# Frontend Engineering Skill

## 1. Purpose

Build frontend experiences for PayPilot AI — the AI-powered Idea-to-Business Opportunity Network — that are intuitive, responsive, accessible, consistent, and reliable.

The interface guides users through the complete 9-stage opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

## 2. When to Use

Use this skill when:

- Creating or modifying opportunity pages, layouts, and components across the 8 PayPilot modules.
- Implementing Idea Capture Studio forms with editable AI-extracted suggestions.
- Building AI Business Analyst opportunity breakdown and assumption views.
- Developing Opportunity Press draft preview and creator publication controls.
- Building Opportunity Discovery Network search, filtering, and match badges.
- Implementing the AI Deal Room proposal comparison and milestone acceptance UI.
- Integrating PayPal milestone checkout buttons and transaction receipts.
- Designing responsive, accessible, and user-friendly error boundaries and empty states.

For overall opportunity lifecycle guidance, consult the `opportunity-lifecycle` skill.

## 3. Design Principles & Opportunity UX

- **Opportunity-Centered Experience:** Keep the opportunity front and center. Show its current stage, required capabilities, and progress clearly.
- **Human-in-the-Loop Agency:** AI suggestions must never be auto-saved. Always present AI extractions in editable form fields with explicit "Confirm" or "Save" buttons.
- **Anti-Hallucination Forms:** When fields are unmentioned in input descriptions, display clean blank inputs (`""`), never invented placeholder text.
- **Evidence Transparency:** Visually distinguish user-entered facts, AI hypotheses, verified external metrics, and recommendations using clear badges.
- **Visual Consistency:** Use Tailwind CSS with established project design tokens (colors, typography, spacing).

## 4. Error Handling & User-Friendly UX

- **Zero Technical Jargon:** Never expose internal API URLs (e.g. `http://127.0.0.1:8000/api/v1`), stack traces, HTTP status codes, or raw backend exception messages on the UI.
- **Actionable & Empathetic Messages:** Communicate problems in plain, understandable language with clear recovery actions (e.g. *"We're having trouble connecting right now. Please check your internet connection or try again in a few moments."*).
- Provide clear loading skeletons, empty states with clear calls-to-action, and non-blocking toast notifications.

## 5. Component Architecture & Next.js

- Follow Next.js App Router conventions.
- Prefer Server Components for data-fetching pages; use Client Components (`"use client"`) only where interactive state or browser events are required.
- Keep components modular, focused, and single-responsibility.
- Separate UI presentation from business logic and data access.
- Reuse shared layouts, styles, hooks, and UI primitives.

## 6. Accessibility (WCAG 2.1 AA)

- Use semantic HTML elements (`<main>`, `<nav>`, `<article>`, `<button>`, `<label>`).
- Support full keyboard navigation and logical tab ordering.
- Provide visible focus rings for interactive elements.
- Associate all form labels explicitly with inputs.
- Maintain sufficient color contrast ratios.
- Support screen readers with appropriate ARIA attributes.

## 7. Financial & PayPal UI Standards

- Display currency amounts and milestone values with clear, consistent formatting (e.g., `$1,250.00 USD`).
- Always show transparent milestone details and deliverables before prompting payment.
- Require explicit user confirmation before initiating checkout.
- Never declare a payment successful based solely on a frontend event; wait for verified backend capture confirmation.
- Disable submit buttons during pending transactions to prevent duplicate charges.

## 8. Frontend Testing & Verification

- Test component rendering, form validation, and user interactions with React Testing Library or Playwright.
- Test error boundaries: verify that network disconnections show helpful user-friendly messages without technical jargon.
- Test responsive layouts across desktop, tablet, and mobile breakpoints.
- Run type checks (`tsc --noEmit`) and lint checks before completing work.

## 9. Quality Checklist

- [ ] Interface aligns with the opportunity lifecycle.
- [ ] AI-suggested fields are editable and require explicit human confirmation.
- [ ] Unprovided attributes remain blank, never invented.
- [ ] Error messages are friendly and free of technical URLs or traces.
- [ ] Responsive across desktop, tablet, and mobile.
- [ ] Meets WCAG 2.1 AA accessibility standards.
- [ ] TypeScript types are clean with no `any`.
- [ ] Frontend tests pass.

## 10. Completion Standard

Frontend work is complete when interfaces are intuitive, accessible, responsive, error-resilient, and faithfully implement the opportunity lifecycle workflow.

**Final principle:** A great interface empowers the user to turn an idea into commercial reality with confidence, clarity, and complete control.
