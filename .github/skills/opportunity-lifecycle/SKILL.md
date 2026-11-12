---
name: opportunity-lifecycle
description: Design, model, implement, and verify the end-to-end Opportunity Lifecycle (Capture → Understand → Develop → Publish → Discover → Match → Negotiate → Transact → Grow) across Opnly modules, domain models, and services.
---

# Opportunity Lifecycle Skill

## 1. Purpose & Vision

Opnly is an **AI-powered Idea-to-Business Opportunity Network**.

Its purpose is to transform ideas, real-world business problems, skills, resources, and commercial capabilities into structured, discoverable opportunities, and connect the participants required to turn them into real commercial outcomes.

The **Opportunity** is the central domain entity of Opnly. It is not merely a freelance gig, job post, business directory listing, social media status, or payment invoice. It is an evolving commercial initiative that moves through a disciplined 9-stage lifecycle.

## 2. The 9-Stage Opportunity Lifecycle

```
Capture ──> Understand ──> Develop ──> Publish ──> Discover
                                                      │
Grow <── Transact <── Negotiate <── Match <───────────┘
```

Every product feature, API route, database model, UI view, and agent must support one or more of these stages:

### Stage 1: Capture
- **Goal:** Capture an idea, business problem, or commercial capability in natural language (text, notes, audio, or document).
- **Core Principle:** Preserve raw user input untouched. Allow partial, unstructured notes without forcing full forms.

### Stage 2: Understand
- **Goal:** Extract structured opportunity fields using AI while respecting factuality.
- **Core Principle:** Anti-hallucination. Unmentioned fields must remain blank (`""`), never invented. Label inferences as hypotheses.

### Stage 3: Develop
- **Goal:** Deepen the business model, identify unstated assumptions, assess risks, and determine required capabilities (skills, equipment, funding, partnerships).
- **Core Principle:** Ground recommendations in verified domain knowledge and prompt the creator to address uncertainties.

### Stage 4: Publish
- **Goal:** Generate a professional Opportunity Press profile and manage creator-approved publication.
- **Core Principle:** Human control. The opportunity remains in `DRAFT` until the creator explicitly approves publication. Internal notes, raw ideas, and proprietary details remain confidential.

### Stage 5: Discover
- **Goal:** Allow participants (creators, developers, wholesalers, businesses) to search and explore published opportunities.
- **Core Principle:** Visibility enforcement. Only `PUBLIC` opportunities appear in network search; `PRIVATE` and `SHARED` opportunities remain protected.

### Stage 6: Match
- **Goal:** Recommend compatible collaborators, providers, or buyers based on complementary skills, resources, and geographic/industry compatibility.
- **Core Principle:** Explainable matching. Every match recommendation must provide transparent rationale badges. Match scores must never be claimed as guarantees of success.

### Stage 7: Negotiate
- **Goal:** Support proposal drafting, pricing, deliverable definitions, milestones, and responsibilities in the AI Deal Room.
- **Core Principle:** Dual-party confirmation. Binding agreements require explicit mutual acceptance from all participating parties.

### Stage 8: Transact
- **Goal:** Execute approved commercial milestone settlements and escrow releases via official PayPal integrations.
- **Core Principle:** Verified settlement. Monetary amounts use deterministic Python `Decimal`; payment status requires server-to-server verification and webhook authentication; frontend success is never assumed as proof.

### Stage 9: Grow
- **Goal:** Track progress, milestone deliverables, verified revenue, and reputation over time in the Commerce Ledger.
- **Core Principle:** Immutable auditability. Historical progress and financial settlements are preserved accurately.

---

## 3. Core Product Modules & Boundaries

Opnly organizes functionality into 8 distinct modules:

| Module | Primary Responsibility |
|---|---|
| **Idea Capture Studio** | Captures ideas, problems, and notes; provides accessible input forms. |
| **AI Business Analyst** | Structures opportunities, identifies assumptions, risks, and required capabilities. |
| **Opportunity Press** | Formats professional publication profiles and manages creator publication controls. |
| **Opportunity Discovery Network** | Enables indexed search, filtering, and discovery of public opportunities. |
| **Intelligent Matchmaking** | Evaluates complementarity and provides explainable match rationale badges. |
| **AI Deal Room** | Facilitates proposal drafting, milestone structuring, and mutual contract agreement. |
| **Payments & Transaction Intelligence** | Settles commercial milestones via PayPal, verifies webhooks, and records ledger events. |
| **Opportunity Evolution** | Tracks milestone delivery, lifecycle progression, and business growth metrics. |

Keep boundaries clean: do not implement transaction logic in the discovery service, or idea capture parsing in the deal room.

---

## 4. Opportunity Domain Model & Status Lifecycle

### Opportunity Status Lifecycle State Machine

```
[DRAFT] ──(Creator publishes)──> [PUBLISHED] ──(Participants matched)──> [MATCHING]
   │                                                                          │
   ▼                                                                          ▼
[ANALYSED]                                                             [NEGOTIATING]
                                                                              │
[ARCHIVED] <─── [COMPLETED] <─── [GROWING] <─── [TRANSACTING] <───────────────┘
```

- `DRAFT`: Initial opportunity captured; editable by creator only.
- `ANALYSED`: Structured by AI Business Analyst; assumptions and requirements identified.
- `PUBLISHED`: Creator has authorized public network visibility via Opportunity Press.
- `MATCHING`: Actively paired with compatible network participants.
- `NEGOTIATING`: Active proposals under discussion in the AI Deal Room.
- `TRANSACTING`: Milestones and payment settlements in progress via PayPal.
- `GROWING`: Active commercial execution and milestone tracking.
- `COMPLETED`: All agreed milestones delivered, verified, and settled.
- `ARCHIVED`: Closed, withdrawn, or historical opportunity.

### Publication Visibility Levels
- `PRIVATE`: Accessible only to the creator and authorized internal collaborators.
- `SHARED`: Accessible to participants invited to a specific AI Deal Room.
- `PUBLIC`: Discoverable across the global Opportunity Network.

---

## 5. Anti-Hallucination & Factuality Principles

When extracting or analyzing opportunities:
1. **Zero Invention:** If an attribute is not present in the user's input, leave it empty (`""`). Never fabricate company names, websites, revenue figures, currencies, or target markets.
2. **Evidence Categorization:** Clearly distinguish:
   - *User Facts:* Explicitly stated in the prompt.
   - *Verified Data:* Backed by database records or external API checks.
   - *Deterministic Math:* Backend formula outputs.
   - *AI Hypotheses:* Analytical suggestions subject to creator validation.
   - *Recommendations:* Suggested next steps.
   - *Missing Context:* Explicitly identified information gaps.

---

## 6. Human-in-the-Loop Authority

Automated workflows must never override human discretion on consequential actions:
- **No Auto-Save:** AI-extracted forms must be editable and confirmed by the user before saving.
- **No Auto-Publish:** The user must explicitly press Publish.
- **No Auto-Sign:** Commercial terms and milestones require explicit confirmation from both parties.
- **No Auto-Transact:** Payments require explicit user authorization before execution.

---

## 7. Financial & PayPal Integration Standards

- Always calculate monetary values using Python `Decimal`.
- Integrate exclusively with official PayPal REST API v2 endpoints.
- Authenticate incoming webhooks with cryptographic signature verification.
- Enforce idempotency using unique transaction reference IDs.
- Record all financial events in an immutable Commerce Ledger.
- Never use real live funds or credentials during automated testing.

---

## 8. User Experience & Error Handling

- Present friendly, understandable, and empathetic error messages to users.
- Never display raw stack traces, database errors, or internal service URLs (e.g. `http://127.0.0.1:8000/api/v1`) on the UI.
- Provide clear loading states, empty states, and feedback toasts.

