---
name: Frontend Engineering Standards
description: Project-specific instructions for Next.js, React, TypeScript, Tailwind CSS, Opportunity lifecycle interfaces, human-in-the-loop forms, and PayPal UI integration.
applyTo: "frontend/**/*.{ts,tsx,js,jsx,css}"
---

# Frontend Engineering Instructions

## 1. Product Context & Opportunity Interfaces

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

The frontend guides users through the complete opportunity lifecycle:
**Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow**

Core product modules and interfaces:
- **Idea Capture Studio:** Simple, inviting interface to capture ideas, notes, and business problems. Displays extracted attributes in editable form fields.
- **AI Business Analyst Views:** Structured breakdown of opportunity potential, key assumptions, required skills/resources, and risk indicators.
- **Opportunity Press:** Professional publication preview with visibility toggles (`PRIVATE`, `SHARED`, `PUBLIC`) and explicit Publish approval.
- **Opportunity Discovery Network & Matchmaking:** Search, filter, and discover compatible opportunities and collaborators with explainable match rationale badges.
- **AI Deal Room:** Interactive proposal builder, milestone breakdown table, and mutual approval actions for commercial terms.
- **Payments & Transaction Intelligence:** Milestone settlement cards, PayPal SDK checkout integration, clear payment status indicators, and ledger receipts.
- **Opportunity Evolution:** Visual progress tracking of opportunity maturation from raw idea through funded commercial execution.

## 2. Human-in-the-Loop & Anti-Hallucination UX

- **AI Suggestions Are Never Auto-Saved:** Extracted business details, opportunity drafts, and proposal terms must be presented as editable suggestions. The user must review, modify, and explicitly confirm before data is persisted.
- **No Invented Data:** When AI extracts fields from a description, unprovided attributes must remain clean, blank input fields (`""`). Never fill forms with fictional default values.
- **Evidence Transparency:** Visually distinguish user-provided inputs, AI hypotheses, verified external data, and system-calculated totals with clear badges or subtle visual cues.

## 3. Human-Understandable Error Handling & UX

- **No Technical Jargon in the UI:** Never expose internal API URLs (e.g. `http://127.0.0.1:8000/api/v1`), stack traces, HTTP error codes, or raw backend exception messages to the user.
- **Actionable, Empathetic Messaging:** Translate network or server failures into helpful, user-oriented text (e.g., *"We're having trouble connecting to Opnly services right now. Please check your connection or try again shortly."*).
- Provide clear loading states (skeletons), empty states with calls to action, and non-blocking toast notifications.

## 4. Next.js and React Architecture

- Follow Next.js App Router conventions.
- Prefer React Server Components for data-fetching pages; use Client Components (`"use client"`) only where interactive state, forms, or browser events are required.
- Keep components modular, focused, and single-responsibility.
- Avoid bulky third-party UI libraries when lightweight Tailwind components and primitives suffice.

## 5. TypeScript & Data Contracts

- Define strict TypeScript interfaces for all opportunity lifecycle stages, proposals, business profiles, and API payloads.
- Keep frontend types in sync with backend Pydantic schemas.
- Do not use `any`. Validate incoming API payloads at network boundaries.
- Gracefully handle nullable and optional opportunity attributes.

## 6. Financial UI & PayPal Integration

- Display currency amounts, milestone values, and fees with consistent formatting and explicit currency symbols (e.g., `$1,250.00 USD`).
- Always show clear milestone breakdown cards before requesting payment.
- Require explicit user confirmation before opening PayPal approval flows.
- Never declare a payment successful based solely on a frontend event; wait for verified server-to-server capture confirmation.
- Disable submit buttons during pending transactions to prevent double-clicks or duplicate charges.

## 7. Accessibility, Responsiveness & Styling

- Use Tailwind CSS with established design tokens (colors, typography, spacing).
- Ensure full responsiveness across desktop, tablet, and mobile breakpoints.
- Meet WCAG 2.1 AA accessibility guidelines: proper heading hierarchy, ARIA attributes, semantic HTML, keyboard focus management, and accessible color contrast.

## 8. Testing & Verification

- Write component and integration tests (React Testing Library / Jest / Playwright) covering:
  - Form editing and submission flows.
  - Extraction review and confirmation behavior.
  - Error and loading boundary handling.
  - Deal Room proposal acceptance interactions.
- Run type checks (`tsc --noEmit`) and lint checks before completing tasks.
