---
name: Frontend Engineering Standards
description: Project-specific instructions for Next.js, React, TypeScript, Tailwind CSS, and frontend integrations.
applyTo: "frontend/**/*.{ts,tsx,js,jsx,css}"
---

# Frontend Engineering Instructions

## 1. Architecture

- Follow the existing Next.js project structure.
- Use TypeScript for application development.
- Keep components focused and reusable.
- Separate UI presentation from business logic.
- Reuse existing layouts, components, and design tokens.
- Avoid unnecessary dependencies.

## 2. React and Next.js

- Follow established React and Next.js conventions.
- Use Server Components by default where appropriate.
- Use Client Components only when browser interactivity or client-side state is needed.
- Keep component responsibilities clear.
- Use appropriate loading and error boundaries.
- Avoid unnecessary client-side JavaScript.

## 3. TypeScript

- Define clear types for component props and API responses.
- Avoid `any` unless genuinely necessary.
- Validate external data at application boundaries.
- Keep shared types consistent with backend contracts.
- Do not assume API responses are valid without checking them.

## 4. UI and Design

- Use Tailwind CSS and existing project design conventions.
- Maintain consistent spacing, typography, colors, and layouts.
- Build responsive interfaces for desktop, tablet, and mobile.
- Prioritize accessibility and keyboard navigation.
- Use semantic HTML and meaningful labels.
- Provide loading, empty, success, and error states.

## 5. API Integration

- Use established API service or data-access patterns.
- Keep API calls out of unrelated presentation components.
- Handle loading, errors, and unexpected responses.
- Do not expose private API keys or backend credentials.
- Avoid duplicating backend business logic in the frontend.

## 6. Financial UI Requirements

- Display currency and monetary values consistently.
- Distinguish actual values from estimates and forecasts.
- Display transaction states accurately.
- Never present unverified payment results as successful.
- Prevent accidental duplicate submissions.
- Require clear user confirmation for consequential actions.

## 7. Security

- Treat browser input and API responses as untrusted.
- Never rely on frontend checks for authorization.
- Avoid unsafe HTML rendering.
- Do not store sensitive credentials in browser storage.
- Do not expose private business information unnecessarily.

## 8. Performance

- Avoid unnecessary re-renders.
- Optimize images and expensive components.
- Load large or rarely used features appropriately.
- Avoid unnecessary network requests.
- Follow existing project performance conventions.

## 9. Testing

- Test important component behavior.
- Validate forms and user interactions.
- Test API success and failure states.
- Verify responsive behavior.
- Test critical payment-related interactions.
- Run relevant frontend checks after changes.

## 10. Change Management

- Avoid unrelated UI redesigns.
- Preserve existing user workflows.
- Update shared types when API contracts change.
- Report files changed and checks actually executed.
- Never commit or push without authorization.