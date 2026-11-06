# Opnly — Postman API Workspace & Verification Suite

This directory contains the official Postman API collection and environment files for developing, verifying, and testing the **Opnly (formerly PayPilot AI) Backend API**.

---

## Files in this Directory

| File | Purpose |
| :--- | :--- |
| `Opnly_API.postman_collection.json` | Complete API collection (v2.1.0) covering all opportunity network modules with automated test assertions. |
| `Opnly_Local.postman_environment.json` | Environment variables pre-configured for local testing (`http://127.0.0.1:8000`). |
| `PayPilot_AI_API.postman_collection.json` | Backward-compatible alias matching `Opnly_API.postman_collection.json`. |
| `PayPilot_Local.postman_environment.json` | Backward-compatible alias matching `Opnly_Local.postman_environment.json`. |

---

## Comprehensive Module Coverage

The Postman collection is organized into 8 functional lifecycle modules:

1. **System & Health**
   - `GET /` — Root service verification.
   - `GET /health` — Application health probe.
   - `GET /api/v1/health` — API v1 route verification (used by frontend status indicator).

2. **Authentication & Session Management**
   - `POST /api/v1/auth/register` — Register new user account.
   - `POST /api/v1/auth/login` — Authenticate and automatically capture `{{accessToken}}`.
   - `GET /api/v1/auth/me` — Verify token session.

3. **Opportunity Network & Discovery**
   - `GET /api/v1/opportunities/published` — Public discovery feed (powers homepage & explore network).
   - `GET /api/v1/opportunities/published?q=Fintech` — Search bar keyword filtering across title, skills, and industry.
   - `POST /api/v1/opportunities` — Create structured opportunity draft.
   - `GET /api/v1/opportunities` — List authenticated user's opportunities.
   - `POST /api/v1/opportunities/analyze` — AI Business Analyst viability & business model evaluation.
   - `POST /api/v1/opportunities/:id/publish` — Publish opportunity to the network.

4. **Intelligent Matchmaking**
   - `GET /api/v1/matches/opportunities` — Transparent match recommendations with explainable scores.
   - `GET /api/v1/matches/candidates/:id` — Candidate participant matching for specific opportunities.

5. **Profiles & Identity**
   - `GET /api/v1/profiles/me` — Combined individual & business profiles.
   - `PUT /api/v1/profiles/me/individual` — Update individual skills, headline, and bio.

6. **Connections & Commercial Proposals**
   - `POST /api/v1/connections/requests` — Send collaboration connection request.
   - `GET /api/v1/connections/requests` — List incoming & outgoing requests.
   - `POST /api/v1/proposals` — Submit structured proposal with milestones & budget breakdown.

7. **AI Deal Rooms**
   - `GET /api/v1/deal-rooms` — List collaboration workspaces.
   - `POST /api/v1/deal-rooms/:id/ai/analyze` — Progress, milestone audit, and deliverable readiness analysis.

8. **Dashboard, Commerce Ledger & Copilot**
   - `GET /api/v1/dashboard/overview` — Business financial KPIs.
   - `GET /api/v1/ledger` — Transaction ledger audit trail.
   - `GET /api/v1/copilot/recommendation` — Working capital decision intelligence.
   - `POST /api/v1/copilot/chat` — Conversational inquiry regarding deals, milestones, or revenues.

---

## How to Import into Postman

1. Open **Postman**.
2. Click **Import** in the top-left corner.
3. Select or drag & drop:
   - `postman/Opnly_API.postman_collection.json`
   - `postman/Opnly_Local.postman_environment.json`
4. In the top-right environment dropdown, select: **Opnly - Local Environment**.
5. Start your backend server:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
6. Start your frontend server:
   ```bash
   cd frontend
   npm run dev
   ```
7. In Postman, run the collection or execute individual requests.

---

## Automated CLI Verification (Newman)

To run the full API test suite from the terminal or in CI:

```bash
npx newman run postman/Opnly_API.postman_collection.json -e postman/Opnly_Local.postman_environment.json
```
