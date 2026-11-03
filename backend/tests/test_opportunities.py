from unittest.mock import AsyncMock, patch

import httpx
import pytest
from app.core.database import Base, get_db
from app.main import app
from app.models.opportunity import OpportunityType, ProvenanceCategory
from app.schemas.opportunity import (
    OpportunityAnalysisData,
)
from app.services.opportunity_analyst import (
    DeterministicOpportunityAnalyst,
    GeminiProvider,
    OpportunityAnalystService,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client_with_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ---------------------------------------------------------------------------
# Unit Tests: Deterministic Analyst & Anti-Hallucination
# ---------------------------------------------------------------------------


def test_deterministic_analyst_idea_submission():
    analyst = DeterministicOpportunityAnalyst()
    text = (
        "We want to build a real-time freight tracking and cargo coordination platform "
        "for mid-sized trucking companies and logistics dispatchers in North America."
    )
    res = analyst.analyze(OpportunityType.IDEA, text)

    assert "Freight" in res.industry or "Logistics" in res.industry
    assert res.proposed_solution == text
    assert len(res.target_customer_segments) > 0
    assert len(res.potential_business_models) > 0
    assert len(res.missing_information) > 0
    assert len(res.suggested_follow_up_questions) > 0

    # Provenance checks
    assert res.provenance["proposed_solution"] == ProvenanceCategory.USER_PROVIDED
    assert res.provenance["problem_statement"] == ProvenanceCategory.AI_HYPOTHESIS
    assert res.provenance["missing_information"] == ProvenanceCategory.MISSING_UNKNOWN


def test_deterministic_analyst_problem_submission():
    analyst = DeterministicOpportunityAnalyst()
    text = (
        "Independent clinic doctors spend over 15 hours every week manually reconciling "
        "medical billing codes and chasing delayed insurance claims."
    )
    res = analyst.analyze(OpportunityType.PROBLEM, text)

    assert "Healthcare" in res.industry or "FinTech" in res.industry
    assert res.problem_statement == text
    assert len(res.target_customer_segments) > 0
    assert len(res.key_assumptions) > 0

    # Provenance checks
    assert res.provenance["problem_statement"] == ProvenanceCategory.USER_PROVIDED
    assert res.provenance["proposed_solution"] == ProvenanceCategory.AI_HYPOTHESIS


# ---------------------------------------------------------------------------
# Service Tests: Live AI, Fallbacks, and Provider Failures
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_analyst_service_deterministic_when_no_api_key():
    service = OpportunityAnalystService(api_key="")
    res = await service.analyze(
        OpportunityType.IDEA,
        "An automated customer support copilot for Shopify store owners.",
    )

    assert res.mode == "DETERMINISTIC_FALLBACK"
    assert res.provider == "Deterministic Heuristic Engine"
    assert res.confidence == 0.80
    assert "deterministic heuristic analysis" in res.message.lower()


@pytest.mark.anyio
async def test_analyst_service_live_provider_mock_success():
    service = OpportunityAnalystService(api_key="test-gemini-key")

    mock_analysis = OpportunityAnalysisData(
        suggested_title="Shopify AI Customer Support Agent",
        problem_statement="E-commerce merchants lose repeat sales due to slow support.",
        proposed_solution="Automated resolution copilot handling 70% of common queries.",
        target_customer_segments=["Shopify merchants", "DTC brands"],
        customer_pain_points=["Slow ticket response times", "High support staff cost"],
        value_proposition="24/7 instant resolution with zero manual ticketing overhead.",
        industry="Retail & E-Commerce",
        required_skills_and_resources=["NLP engineering", "Shopify API integration"],
        potential_business_models=["B2B SaaS subscription tier"],
        key_assumptions=["Merchants trust AI responses with store policy"],
        risks_and_uncertainties=["Hallucinations causing customer disputes"],
        missing_information=["Average support ticket volume"],
        suggested_follow_up_questions=["Which helpdesk software do you currently use?"],
    )

    with patch.object(
        GeminiProvider, "analyze", new_callable=AsyncMock
    ) as mock_analyze:
        mock_analyze.return_value = mock_analysis
        res = await service.analyze(
            OpportunityType.IDEA,
            "An automated customer support copilot for Shopify store owners.",
        )

        assert res.mode == "LIVE_AI"
        assert res.provider == "Google Gemini"
        assert res.model == "gemini-1.5-flash"
        assert res.analysis.suggested_title == "Shopify AI Customer Support Agent"
        assert (
            res.analysis.provenance["proposed_solution"]
            == ProvenanceCategory.USER_PROVIDED
        )


@pytest.mark.anyio
async def test_analyst_service_falls_back_on_provider_timeout_or_error():
    service = OpportunityAnalystService(api_key="test-failing-key")

    with patch.object(
        GeminiProvider,
        "analyze",
        side_effect=httpx.ConnectTimeout("Connection timed out"),
    ):
        res = await service.analyze(
            OpportunityType.PROBLEM,
            "Independent restaurant owners cannot predict daily food inventory spoilage.",
        )

        # Must fall back gracefully to deterministic analysis without crashing
        assert res.mode == "DETERMINISTIC_FALLBACK"
        assert "Food" in res.analysis.industry
        assert res.analysis.problem_statement != ""


# ---------------------------------------------------------------------------
# API Integration Tests: Analyze Endpoint
# ---------------------------------------------------------------------------


def test_api_analyze_endpoint(client_with_db):
    payload = {
        "submission_type": "IDEA",
        "description": "A collaborative escrow and milestone billing portal for freelance software engineers.",
    }
    response = client_with_db.post("/api/v1/opportunities/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["submission_type"] == "IDEA"
    assert data["mode"] in ["DETERMINISTIC_FALLBACK", "LIVE_AI"]
    assert "analysis" in data
    assert data["analysis"]["suggested_title"] != ""
    assert len(data["analysis"]["target_customer_segments"]) > 0
    assert "provenance" in data["analysis"]


# ---------------------------------------------------------------------------
# API Integration Tests: Create, Retrieve, Update, and Ownership Isolation
# ---------------------------------------------------------------------------


def test_create_and_retrieve_opportunity_draft(client_with_db):
    user_a = "creator_user_101"
    headers_a = {"X-User-ID": user_a}

    payload = {
        "submission_type": "IDEA",
        "title": "Autonomous Gearbox Diagnostics",
        "original_description": "We build machine-learning vibration sensors for industrial wind turbines.",
        "problem_statement": "Wind farm operators suffer catastrophic gearbox failure with zero warning.",
        "proposed_solution": "Edge IoT vibration sensors predict failure 6 weeks in advance.",
        "industry": "Manufacturing & Hardware",
        "value_proposition": "Reduces unplanned downtime by 85%.",
        "target_customer_segments": [
            "Wind turbine operators",
            "Renewable asset managers",
        ],
        "customer_pain_points": [
            "Extreme downtime repair costs",
            "Hazardous inspection climbing",
        ],
        "required_skills_and_resources": ["Signal processing", "Hardware engineering"],
        "potential_business_models": ["Annual hardware-plus-SaaS subscription"],
        "key_assumptions": [
            "Operators can install sensors without taking turbines offline"
        ],
        "risks_and_uncertainties": [
            "Harsh weather conditions damaging external sensor casing"
        ],
        "missing_information": [
            "Number of operational turbines per typical client farm"
        ],
        "suggested_follow_up_questions": [
            "What is the typical turbine maintenance schedule?"
        ],
        "status": "ANALYSED",
        "visibility": "PRIVATE",
    }

    # 1. User A creates opportunity
    create_res = client_with_db.post(
        "/api/v1/opportunities", json=payload, headers=headers_a
    )
    assert create_res.status_code == 201
    created = create_res.json()
    opp_id = created["id"]
    assert opp_id.startswith("opp_")
    assert created["user_id"] == user_a
    assert created["status"] == "ANALYSED"
    assert created["visibility"] == "PRIVATE"

    # 2. User A retrieves own opportunity
    get_res = client_with_db.get(f"/api/v1/opportunities/{opp_id}", headers=headers_a)
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["title"] == "Autonomous Gearbox Diagnostics"
    assert retrieved["target_customer_segments"] == [
        "Wind turbine operators",
        "Renewable asset managers",
    ]

    # 3. User A lists own opportunities
    list_res = client_with_db.get("/api/v1/opportunities", headers=headers_a)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == opp_id for item in list_data["items"])


def test_tenant_isolation_prevents_unauthorized_access(client_with_db):
    user_a = "creator_user_101"
    user_b = "attacker_user_999"
    headers_a = {"X-User-ID": user_a}
    headers_b = {"X-User-ID": user_b}

    payload = {
        "submission_type": "PROBLEM",
        "title": "Proprietary Chip Design Latency",
        "original_description": "Semiconductor verification pipelines take 72 hours per silicon tapeout cycle.",
        "problem_statement": "Silicon verification cycle takes 72 hours.",
        "status": "DRAFT",
    }

    # User A creates a private draft
    create_res = client_with_db.post(
        "/api/v1/opportunities", json=payload, headers=headers_a
    )
    assert create_res.status_code == 201
    opp_id = create_res.json()["id"]

    # User B attempts to access User A's draft -> MUST BE 403 FORBIDDEN
    get_res = client_with_db.get(f"/api/v1/opportunities/{opp_id}", headers=headers_b)
    assert get_res.status_code == 403
    assert "Access denied" in get_res.json()["detail"]

    # User B attempts to update User A's draft -> MUST BE 403 FORBIDDEN
    update_res = client_with_db.put(
        f"/api/v1/opportunities/{opp_id}",
        json={"title": "Hacked Title by User B"},
        headers=headers_b,
    )
    assert update_res.status_code == 403

    # User B attempts to reanalyze User A's draft -> MUST BE 403 FORBIDDEN
    reanalyze_res = client_with_db.post(
        f"/api/v1/opportunities/{opp_id}/reanalyze",
        json={},
        headers=headers_b,
    )
    assert reanalyze_res.status_code == 403

    # User B lists opportunities -> MUST NOT contain User A's draft
    list_res = client_with_db.get("/api/v1/opportunities", headers=headers_b)
    assert list_res.status_code == 200
    user_b_items = list_res.json()["items"]
    assert not any(item["id"] == opp_id for item in user_b_items)


def test_user_can_edit_and_reanalyze_opportunity(client_with_db):
    user_id = "creator_user_202"
    headers = {"X-User-ID": user_id}

    payload = {
        "submission_type": "IDEA",
        "title": "Initial Title Draft",
        "original_description": "An automated invoice factoring tool for small wholesale merchants.",
        "problem_statement": "Wholesalers wait 90 days to receive customer invoice settlements.",
        "status": "DRAFT",
    }

    # 1. Create draft
    create_res = client_with_db.post(
        "/api/v1/opportunities", json=payload, headers=headers
    )
    assert create_res.status_code == 201
    opp_id = create_res.json()["id"]

    # 2. Update with human review edits
    update_payload = {
        "title": "Approved FactorPilot Pro",
        "value_proposition": "Advances 85% of verified invoices in under 4 hours.",
        "status": "ANALYSED",
    }
    update_res = client_with_db.put(
        f"/api/v1/opportunities/{opp_id}", json=update_payload, headers=headers
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["title"] == "Approved FactorPilot Pro"
    assert (
        updated["value_proposition"]
        == "Advances 85% of verified invoices in under 4 hours."
    )
    assert updated["status"] == "ANALYSED"

    # 3. Reanalyze while preserving custom title
    reanalyze_res = client_with_db.post(
        f"/api/v1/opportunities/{opp_id}/reanalyze",
        json={"preserve_user_edits": True},
        headers=headers,
    )
    assert reanalyze_res.status_code == 200
    reanalyzed = reanalyze_res.json()
    # Preserved user title
    assert reanalyzed["title"] == "Approved FactorPilot Pro"
    # Preserved user value proposition
    assert (
        reanalyzed["value_proposition"]
        == "Advances 85% of verified invoices in under 4 hours."
    )
    # Refreshed analytical arrays
    assert len(reanalyzed["key_assumptions"]) > 0
    assert len(reanalyzed["potential_business_models"]) > 0
