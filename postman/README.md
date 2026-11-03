# PayPilot AI — Postman API Workspace & Testing

This directory contains the official Postman API collection and environment files for testing, developing, and verifying the **PayPilot AI Backend API**.

---

## Files in this Directory

| File | Purpose |
| :--- | :--- |
| `PayPilot_AI_API.postman_collection.json` | Comprehensive API collection (v2.1.0) with automated validation scripts. |
| `PayPilot_Local.postman_environment.json` | Pre-configured environment variables for local backend testing (`http://127.0.0.1:8000`). |

---

## API Coverage

The collection covers 6 functional modules:

1. **System & Health**
   - `GET /` — Root service verification.
   - `GET /health` — Application health probe.
   - `GET /api/v1/health` — API v1 route verification.

2. **Business Onboarding & Profile (AI-Assisted)**
   - `POST /api/v1/business/extract` — Natural language entity extractor (verifies anti-hallucination and blanks).
   - `POST /api/v1/business` — Persists business profile in PostgreSQL, linked to `X-User-ID`.
   - `GET /api/v1/business/me` — Fetches current user profile.
   - `GET /api/v1/business` — Lists profiles for authenticated user.

3. **Dashboard & Metrics**
   - `GET /api/v1/dashboard/overview` — Primary KPIs (settled revenue, pending receivables, transaction counts).

4. **Commerce Ledger**
   - `GET /api/v1/ledger` — Transaction ledger.
   - `GET /api/v1/ledger?status=PENDING` — Pending customer orders.

5. **AI Copilot Decision Support**
   - `GET /api/v1/copilot/recommendation` — Working capital acceleration analysis.
   - `POST /api/v1/copilot/chat` — Grounded natural language assistant.

6. **Payment Workflows**
   - `POST /api/v1/payments/approve` — Owner-approved payment capture with idempotency.

---

## How to Import into Postman

1. Open **Postman**.
2. Click **Import** in the top-left corner.
3. Drag & drop or select:
   - `postman/PayPilot_AI_API.postman_collection.json`
   - `postman/PayPilot_Local.postman_environment.json`
4. In the top right corner, select the active environment: **PayPilot AI - Local Environment**.
5. Ensure your backend server is running:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
6. Click **Run collection** to run automated test assertions across all endpoints.

---

## Automated CLI Verification (Newman)

To execute the entire test suite in automated CI or terminal:

```bash
npx newman run postman/PayPilot_AI_API.postman_collection.json -e postman/PayPilot_Local.postman_environment.json
```

