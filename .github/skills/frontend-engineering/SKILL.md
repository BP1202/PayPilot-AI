---
name: frontend-engineering
description: Design, implement, test, and maintain responsive, accessible, performant frontend applications, components, interfaces, and user interactions.
---

# Frontend Engineering Skill

## 1. Purpose

Build frontend experiences that are intuitive, responsive, accessible, consistent, and reliable.

The interface should make complex functionality easy to understand while helping users complete tasks confidently.

## 2. When to Use

Use this skill when:

- Creating or modifying pages, layouts, and UI components.
- Implementing dashboards, charts, forms, and data tables.
- Connecting frontend applications to backend APIs.
- Managing application state and user interactions.
- Improving accessibility, responsiveness, and performance.
- Implementing loading, error, and empty states.
- Reviewing frontend code and design consistency.

## 3. Design Principles

- Prioritize clarity, usability, and visual consistency.
- Use a coherent design system for colors, typography, spacing, and components.
- Keep layouts clean and avoid unnecessary visual complexity.
- Establish clear visual hierarchy and readable content.
- Use meaningful feedback for important user actions.
- Avoid decorative elements that reduce usability.
- Follow existing design conventions before introducing new ones.

## 4. Component Architecture

- Build reusable components around clear responsibilities.
- Keep components focused and reasonably small.
- Separate presentation from business logic where practical.
- Reuse shared layouts, styles, hooks, and utilities.
- Avoid unnecessary component nesting and duplication.
- Use descriptive names and predictable component interfaces.
- Avoid introducing abstractions without a real reuse or maintenance benefit.

## 5. Responsive Design

- Support mobile, tablet, and desktop layouts.
- Use flexible layouts and appropriate responsive breakpoints.
- Prevent horizontal overflow and clipped content.
- Keep navigation and important actions accessible on smaller screens.
- Ensure charts, tables, and forms remain usable across screen sizes.
- Test actual layouts rather than assuming responsiveness from CSS alone.

## 6. Accessibility

- Use semantic HTML elements appropriately.
- Support keyboard navigation.
- Provide visible focus indicators.
- Associate form labels with their inputs.
- Use meaningful accessible names for interactive controls.
- Maintain sufficient text and interface contrast.
- Provide appropriate alternative text for meaningful images.
- Do not rely on color alone to communicate important information.
- Respect reduced-motion preferences where animations are used.

## 7. Frontend State and API Integration

- Keep state ownership clear and predictable.
- Avoid unnecessary duplicated state.
- Validate user input before submission.
- Handle loading, success, empty, and error states.
- Use typed API contracts where supported.
- Avoid hardcoded production data or fake success responses.
- Handle expired sessions and failed requests gracefully.
- Never expose private backend credentials in client-side code.

## 8. Financial and Payment Interfaces

For financial applications:

- Display currency and amounts consistently.
- Distinguish actual values from forecasts and estimates.
- Clearly identify pending, completed, failed, and cancelled transactions.
- Make payment recipients, amounts, and currencies easy to review.
- Require clear confirmation before consequential actions.
- Prevent accidental duplicate submissions.
- Do not present frontend state as proof of a completed transaction.
- Communicate errors and payment status honestly.

For PayPilot AI, AI recommendations should be visually distinguishable from verified financial records and actual payment outcomes.

## 9. Performance

- Avoid unnecessary rendering and expensive computations.
- Load large or optional components only when appropriate.
- Optimize images and static assets.
- Avoid excessive dependencies.
- Use pagination or virtualization for large datasets when beneficial.
- Keep animations smooth and purposeful.
- Measure performance before introducing complex optimizations.

## 10. Error Handling and User Feedback

- Provide understandable validation messages.
- Show clear feedback after user actions.
- Prevent repeated submissions while operations are in progress.
- Handle network failures without losing important user input.
- Avoid exposing internal errors or technical stack traces.
- Provide recovery options where practical.
- Never display a success state before the operation is confirmed.

## 11. Frontend Testing

- Test important components and user interactions.
- Verify form validation and error handling.
- Test API loading and failure states.
- Check responsive layouts at relevant viewport sizes.
- Test keyboard navigation and accessibility.
- Validate important end-to-end user workflows.
- Check browser console output for unexpected errors.
- Do not rely exclusively on screenshots or successful builds.

## 12. Frontend Development Workflow

1. Understand the user workflow and expected interface behavior.
2. Inspect existing pages, components, styles, and design conventions.
3. Identify required API data and state dependencies.
4. Plan the component structure.
5. Implement the interface and interactions.
6. Add loading, empty, success, and error states.
7. Test responsive behavior and accessibility.
8. Review the final UI and verify important workflows.

## 13. Quality Checklist

- [ ] Interface follows the existing design system.
- [ ] Components have clear responsibilities.
- [ ] Layout works across relevant screen sizes.
- [ ] Interactive elements are accessible.
- [ ] API integration handles success and failure.
- [ ] Loading and empty states are implemented.
- [ ] Financial information is clearly presented.
- [ ] Sensitive information is not exposed.
- [ ] Important user workflows are tested.
- [ ] No obvious visual or browser-console issues remain.

## 14. Completion Standard

Frontend work is complete when the interface behaves correctly, communicates application state accurately, works across relevant screen sizes, and provides an accessible and consistent user experience.

**Final principle:** Build interfaces that make powerful functionality feel simple, trustworthy, and effortless.