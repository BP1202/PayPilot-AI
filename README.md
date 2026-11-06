# Opnly
## Where Ideas Find the Right People

**Opnly** is an AI-powered opportunity creation and business-building platform. It helps people transform raw ideas, business problems, skills, products and resources into structured business opportunities—and connects them with the people and capabilities needed to turn those opportunities into real commercial outcomes.

Our vision is simple:

> Great ideas should not remain trapped in notebooks. They should be discovered, developed, connected with the right people and transformed into real businesses.

---

## 1. The Problem

People with ideas often lack the resources or connections to execute them.

- An engineer has the skills to build a product but cannot find customers or business partners.
- A business owner has an operational problem but cannot find the right person to solve it.
- A freelancer wants to build a scalable product instead of repeatedly delivering individual projects.
- A product creator needs distributors, collaborators or strategic partners.
- An early-stage founder needs expertise, commercial validation or potential investment connections.

These participants are spread across freelance marketplaces, professional networks, startup communities, business directories and private conversations.

Opnly aims to bring these opportunity participants together around actual business needs.

## 2. The Solution

Opnly turns an idea or problem into a structured, discoverable business opportunity.

The platform supports the complete journey:

1. **Capture:** Submit an idea or problem through text, documents, images or voice.
2. **Understand:** AI extracts the problem, proposed solution, target users, requirements, resources and uncertainties.
3. **Develop:** AI helps improve the concept, evaluate possible business models, estimate costs and identify missing information.
4. **Publish:** Generate a professional Opportunity Press publication that the creator reviews and approves.
5. **Discover:** Make opportunities discoverable to relevant businesses, builders, customers and potential partners.
6. **Match:** Recommend compatible participants based on capabilities, needs, commercial fit and preferences.
7. **Negotiate:** Help participants compare proposals, discuss pricing, responsibilities, scope and milestones.
8. **Transact:** Support authorised commercial transactions through integrated payment workflows, including PayPal Sandbox in the prototype.
9. **Grow:** Track progress, agreements, customers, transactions and the evolution of the opportunity.

## 3. Core Product Modules

### A. Idea Capture Studio
A structured workspace for capturing raw ideas and real-world problems. Users can submit text, documents, images and voice recordings. AI converts these inputs into structured information while preserving the creator's original intent.

### B. AI Business Analyst
Analyses the opportunity, identifies assumptions and missing information, proposes business models and helps assess feasibility. It must distinguish user-provided facts, AI-generated hypotheses and independently verified information.

### C. Opportunity Press
Transforms approved ideas into professional, publication-style opportunity profiles. Creators control visibility, publication and updates. Public summaries must not expose confidential information.

### D. Opportunity Discovery Network
Helps participants discover ideas, problems, products, services and collaboration opportunities relevant to their capabilities and goals.

### E. Intelligent Matchmaking
Recommends potential customers, builders, co-founders, suppliers, distributors and strategic partners. Match explanations must show the evidence and criteria behind recommendations.

### F. AI Deal Room
Provides a shared workspace for proposals, pricing comparisons, negotiation assistance, scope, roles, deliverables and milestones. People retain control over all binding decisions.

### G. Payments and Transaction Intelligence
Connects accepted commercial agreements to authorised payment workflows. PayPal integration must use supported APIs and verified transaction events. The AI must never independently authorise or execute a payment.

### H. Opportunity Evolution
Tracks an opportunity as it progresses from an idea to validation, prototype, first customer, recurring revenue, partnership or established business.

## 4. Target Users

The initial product should focus on two connected groups:

**Builders and independent professionals**
- Software developers
- Designers
- Engineers
- Freelancers
- Product creators
- Independent specialists

**Small and growing businesses**
- Dealers and wholesalers
- Manufacturers
- Retailers
- Service businesses
- Businesses seeking technology solutions
- Businesses seeking commercial partnerships

Investors, distributors, larger enterprises and other participants can be introduced as the platform matures.

## 5. Product Differentiation

Opnly is not intended to be another:
- Freelance job marketplace
- Generic business directory
- Startup listing website
- Social networking platform
- Investor pitch portal
- AI chatbot
- Payment dashboard

Its differentiating ambition is to connect the entire opportunity lifecycle.

An idea can attract multiple customers. Multiple customers can reveal a reusable product opportunity. Builders can join the creator. Commercial partners can contribute distribution. Proposals can be compared. An initial project can evolve into a long-term business.

The platform should preserve this evolution as structured business memory.

## 6. AI and Agent Architecture

AI must be an active part of the product, not a decorative chat interface.

Planned specialist responsibilities:

- **Idea Capture Agent:** Understands and structures submitted ideas.
- **Business Analyst Agent:** Evaluates concepts and identifies assumptions.
- **Publication Agent:** Creates professional opportunity publications.
- **Discovery Agent:** Finds relevant opportunities and participants.
- **Matchmaking Agent:** Explains compatibility between participants.
- **Pricing and Strategy Agent:** Helps analyse costs, pricing and commercial options.
- **Deal Agent:** Assists with proposals, negotiation and agreement preparation.
- **Transaction Agent:** Uses narrowly scoped payment tools and reports verified transaction status.
- **Growth Agent:** Tracks progress and recommends next steps.

Agents should share consistent opportunity context and use explicit tool permissions. Use deterministic backend services for financial calculations and transaction state. Require human approval for consequential actions.

Do not create an unnecessarily large agent swarm. Start with a reliable orchestrator and specialist capabilities that have clear responsibilities.

## 7. PayPal Integration

PayPal is the transaction infrastructure for the commercial relationships formed through Opnly.

The prototype should demonstrate a real PayPal Sandbox workflow where supported, such as creating an order or payment request, obtaining approval and recording the verified result.

Requirements:
- Use official PayPal APIs and supported SDKs.
- Keep credentials on the backend.
- Verify webhooks before changing transaction state.
- Never trust client-submitted payment status.
- Require explicit user approval for payment actions.
- Clearly distinguish Sandbox demonstrations from live transactions.
- Verify country, currency, product and account eligibility before claiming a payment capability.

AI prepares and assists with transactions; the payment backend executes only authorised actions.

## 8. Trust, Privacy and Safety

- Creators control whether an idea is private, shared with selected participants or publicly published.
- Confidential documents must have explicit access controls.
- Clearly label AI-generated content and unverified claims.
- Do not invent investors, customer demand, market validation or financial performance.
- Do not guarantee investment returns, profitability or business success.
- Protect intellectual property and support controlled disclosure.
- Record important actions and approvals in an auditable history.
- Never let an AI agent make binding agreements or financial commitments without human authorisation.

## 9. Initial Prototype Scope

Build one complete, demonstrable journey:

1. A builder submits a business idea or a business owner submits a problem.
2. AI structures and analyses the submission.
3. The creator reviews and publishes an Opportunity Press page.
4. Another participant discovers the opportunity and expresses interest.
5. AI explains the match and helps prepare a proposal.
6. Participants compare and approve a commercial agreement.
7. A supported PayPal Sandbox transaction demonstrates the payment journey.
8. The opportunity timeline records its progress.

The prototype must be coherent and functional. Avoid implementing an entire ERP, social network, investment exchange or unrestricted payment platform.

## 10. Engineering Principles

- Preserve the existing project architecture unless a justified change is approved.
- Prefer modular, typed, testable services.
- Keep business logic out of UI components.
- Validate inputs at system boundaries.
- Use database migrations for schema changes.
- Keep secrets out of source control.
- Add tests for new functionality and important edge cases.
- Use official integration documentation.
- Verify API behavior rather than assuming an integration works.
- Maintain accessible, responsive and consistent UI.
- Do not replace working functionality with static mockups.
- Document important architectural decisions.

## 11. Definition of Done

A task is complete only when:

1. It serves a clearly identified product requirement.
2. It follows the repository instructions and relevant specialist skills.
3. It does not break existing functionality.
4. It has appropriate validation and tests.
5. It passes the relevant lint, type-check and build commands.
6. Integrations are verified or explicitly labelled as simulated.
7. Security, permissions and human approval requirements are respected.
8. Documentation is updated where necessary.
9. The result is reported honestly, including limitations and remaining work.

## 12. Long-Term Vision

Opnly aims to become an opportunity-to-business network where ideas, problems, skills, customers, resources, capital and commercial relationships can find one another.

It should help people move from:

**Idea → Opportunity → Collaboration → Agreement → Transaction → Business → Growth**

The ultimate measure of success is not the number of ideas published. It is the number of meaningful opportunities that become validated collaborations and real businesses.

---

**Product principle:** Every feature, agent, skill, API integration and engineering task must contribute to making this journey more useful, trustworthy and achievable.
