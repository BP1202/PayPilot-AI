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


def make_auth_user(
    client: TestClient, email: str, name: str
) -> tuple[str, dict[str, str]]:
    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": name},
    )
    data = res.json()
    return data["user"]["id"], {"Authorization": f"Bearer {data['access_token']}"}


def test_create_and_retrieve_opportunity_draft(client_with_db):
    user_a, headers_a = make_auth_user(client_with_db, "user_a@windtech.demo", "User A")

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
    _user_a, headers_a = make_auth_user(
        client_with_db, "user_a@windtech.demo", "User A"
    )
    _user_b, headers_b = make_auth_user(
        client_with_db, "user_b@chiptech.demo", "User B"
    )

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
    _user_id, headers = make_auth_user(
        client_with_db, "creator202@factoring.demo", "Creator 202"
    )

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


def test_unauthenticated_opportunity_endpoints_return_401(client_with_db):
    # 1. Listing without auth
    list_res = client_with_db.get("/api/v1/opportunities")
    assert list_res.status_code == 401

    # 2. Creating draft without auth
    create_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "title": "Unauthorized Idea",
            "original_description": "A description text for test",
        },
    )
    assert create_res.status_code == 401

    # 3. Getting opportunity without auth
    get_res = client_with_db.get("/api/v1/opportunities/opp_nonexistent")
    assert get_res.status_code == 401

    # 4. Updating opportunity without auth
    put_res = client_with_db.put(
        "/api/v1/opportunities/opp_nonexistent",
        json={"title": "Updated Title"},
    )
    assert put_res.status_code == 401


def test_expired_session_token_rejected_with_401(client_with_db):
    from datetime import timedelta

    from app.core.security import create_access_token

    user_id, _ = make_auth_user(
        client_with_db, "expired_user@demo.test", "Expired User"
    )
    expired_token = create_access_token(
        user_id=user_id,
        email="expired_user@demo.test",
        expires_delta=timedelta(minutes=-30),
    )
    expired_headers = {"Authorization": f"Bearer {expired_token}"}

    res = client_with_db.get("/api/v1/opportunities", headers=expired_headers)
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_multitenant_opportunities_isolation_and_reopen(client_with_db):
    _user_a, headers_a = make_auth_user(
        client_with_db, "tenant_a@demo.test", "Tenant A"
    )
    _user_b, headers_b = make_auth_user(
        client_with_db, "tenant_b@demo.test", "Tenant B"
    )

    # User A creates opportunity
    opp_a_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "IDEA",
            "title": "Tenant A Secret Initiative",
            "original_description": "Exclusive business opportunity for Tenant A only.",
            "industry": "Aerospace",
        },
        headers=headers_a,
    )
    assert opp_a_res.status_code == 201
    opp_a_id = opp_a_res.json()["id"]

    # User B creates opportunity
    opp_b_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "PROBLEM",
            "title": "Tenant B Supply Bottleneck",
            "original_description": "Exclusive operational challenge for Tenant B only.",
            "industry": "Agriculture",
        },
        headers=headers_b,
    )
    assert opp_b_res.status_code == 201
    opp_b_id = opp_b_res.json()["id"]

    # User A lists opportunities: sees ONLY their own
    list_a = client_with_db.get("/api/v1/opportunities", headers=headers_a).json()
    assert any(item["id"] == opp_a_id for item in list_a["items"])
    assert not any(item["id"] == opp_b_id for item in list_a["items"])

    # User B lists opportunities: sees ONLY their own
    list_b = client_with_db.get("/api/v1/opportunities", headers=headers_b).json()
    assert any(item["id"] == opp_b_id for item in list_b["items"])
    assert not any(item["id"] == opp_a_id for item in list_b["items"])

    # User A reopens their opportunity using persisted backend data
    reopened = client_with_db.get(
        f"/api/v1/opportunities/{opp_a_id}", headers=headers_a
    ).json()
    assert reopened["id"] == opp_a_id
    assert reopened["title"] == "Tenant A Secret Initiative"
    assert reopened["industry"] == "Aerospace"

    # User B attempting to reopen User A's opportunity receives 403 Forbidden
    unauthorized_reopen = client_with_db.get(
        f"/api/v1/opportunities/{opp_a_id}", headers=headers_b
    )
    assert unauthorized_reopen.status_code == 403


def test_two_sided_opportunity_creation_and_filtering(client_with_db):
    _user, headers = make_auth_user(
        client_with_db, "twoside@demo.test", "Two Sided User"
    )

    # 1. User seeks a solution (Seeking Opportunity) in TECH
    seeking_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "PROBLEM",
            "intent": "SEEKING_SOLUTION",
            "category": "TECH",
            "title": "Need Full-Stack Developer for AI Platform",
            "original_description": "We are looking for a senior full-stack engineer to build our web app.",
            "industry": "Software",
        },
        headers=headers,
    )
    assert seeking_res.status_code == 201
    seeking_data = seeking_res.json()
    assert seeking_data["intent"] == "SEEKING_SOLUTION"
    assert seeking_data["category"] == "TECH"
    seeking_id = seeking_data["id"]

    # 2. Same user offers a solution (Offering Opportunity) in FINTECH
    offering_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "IDEA",
            "intent": "OFFERING_SOLUTION",
            "category": "FINTECH",
            "title": "Automated Reconciliation Engine for Freelancers",
            "original_description": "I have developed an automated ledger reconciliation algorithm for microbusinesses.",
            "industry": "Finance",
        },
        headers=headers,
    )
    assert offering_res.status_code == 201
    offering_data = offering_res.json()
    assert offering_data["intent"] == "OFFERING_SOLUTION"
    assert offering_data["category"] == "FINTECH"
    offering_id = offering_data["id"]

    # 3. Filter by intent=SEEKING_SOLUTION
    res_seeking = client_with_db.get(
        "/api/v1/opportunities?intent=SEEKING_SOLUTION", headers=headers
    ).json()
    assert any(item["id"] == seeking_id for item in res_seeking["items"])
    assert not any(item["id"] == offering_id for item in res_seeking["items"])

    # 4. Filter by intent=OFFERING_SOLUTION
    res_offering = client_with_db.get(
        "/api/v1/opportunities?intent=OFFERING_SOLUTION", headers=headers
    ).json()
    assert any(item["id"] == offering_id for item in res_offering["items"])
    assert not any(item["id"] == seeking_id for item in res_offering["items"])

    # 5. Filter by category=TECH
    res_tech = client_with_db.get(
        "/api/v1/opportunities?category=TECH", headers=headers
    ).json()
    assert any(item["id"] == seeking_id for item in res_tech["items"])
    assert not any(item["id"] == offering_id for item in res_tech["items"])

    # 6. Filter by category=FINTECH
    res_fintech = client_with_db.get(
        "/api/v1/opportunities?category=FINTECH", headers=headers
    ).json()
    assert any(item["id"] == offering_id for item in res_fintech["items"])
    assert not any(item["id"] == seeking_id for item in res_fintech["items"])


def test_opportunity_categories_and_validation(client_with_db):
    _user, headers = make_auth_user(
        client_with_db, "categories@demo.test", "Categories User"
    )

    # Verify all 4 categories can be created: FINTECH, TECH, BUSINESS, LOCAL
    for cat in ["FINTECH", "TECH", "BUSINESS", "LOCAL"]:
        res = client_with_db.post(
            "/api/v1/opportunities",
            json={
                "submission_type": "IDEA",
                "intent": "OFFERING_SOLUTION",
                "category": cat,
                "title": f"Opportunity in {cat}",
                "original_description": f"Valid description for category testing in {cat}.",
            },
            headers=headers,
        )
        assert res.status_code == 201
        assert res.json()["category"] == cat

    # Test invalid intent returns 422
    invalid_intent_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "IDEA",
            "intent": "INVALID_INTENT",
            "category": "TECH",
            "title": "Invalid Intent Test",
            "original_description": "Valid description text for schema testing.",
        },
        headers=headers,
    )
    assert invalid_intent_res.status_code == 422

    # Test invalid category returns 422
    invalid_cat_res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "IDEA",
            "intent": "SEEKING_SOLUTION",
            "category": "UNKNOWN_CATEGORY",
            "title": "Invalid Category Test",
            "original_description": "Valid description text for schema testing.",
        },
        headers=headers,
    )
    assert invalid_cat_res.status_code == 422


def test_legacy_payload_defaults_to_seeking_and_business(client_with_db):
    _user, headers = make_auth_user(client_with_db, "legacy@demo.test", "Legacy User")

    # Omit intent and category
    res = client_with_db.post(
        "/api/v1/opportunities",
        json={
            "submission_type": "PROBLEM",
            "title": "Legacy Draft Without Intent",
            "original_description": "Original description without any new intent or category fields.",
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["intent"] == "SEEKING_SOLUTION"
    assert data["category"] == "BUSINESS"
