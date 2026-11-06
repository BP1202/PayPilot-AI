from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.business import Business
from app.models.opportunity import (
    Opportunity,
    OpportunityCategory,
    OpportunityIntent,
    OpportunityStatus,
    OpportunityType,
    OpportunityVisibility,
)
from app.models.profile import IndividualProfile, ProfileVisibility
from app.models.user import User
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def test_db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client_with_db(test_db_session: Session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def make_user(
    db: Session,
    user_id: str,
    email: str,
    full_name: str = "Test User",
) -> tuple[User, str]:
    user = User(
        id=user_id,
        email=email,
        full_name=full_name,
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user_id=user.id, email=user.email)
    return user, token


def create_test_opportunity(
    db: Session,
    opp_id: str,
    user_id: str,
    title: str,
    intent: OpportunityIntent = OpportunityIntent.SEEKING_SOLUTION,
    status: OpportunityStatus = OpportunityStatus.PUBLISHED,
    visibility: OpportunityVisibility = OpportunityVisibility.PUBLIC,
    industry: str = "FinTech",
    required_skills: list[str] | None = None,
) -> Opportunity:
    opp = Opportunity(
        id=opp_id,
        user_id=user_id,
        title=title,
        original_description=f"Description for {title}",
        submission_type=OpportunityType.IDEA.value,
        intent=intent.value,
        category=OpportunityCategory.FINTECH.value,
        status=status.value,
        visibility=visibility.value,
        industry=industry,
        required_skills_and_resources=required_skills or [],
        published_at=(
            datetime.now(UTC) if status == OpportunityStatus.PUBLISHED else None
        ),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return opp


# ---------------------------------------------------------------------------
# TEST CASES
# ---------------------------------------------------------------------------


def test_unauthenticated_cannot_access_user_recommendations(client_with_db: TestClient):
    """Unauthenticated guests cannot access personalized recommendations."""
    resp = client_with_db.get("/api/v1/matches/opportunities")
    assert resp.status_code == 401
    assert "credentials were not provided" in resp.json()["detail"].lower()


def test_get_user_recommendations_with_skill_match(
    client_with_db: TestClient, test_db_session: Session
):
    """Authenticated user receives recommendations ranked by skill and industry overlap."""
    user_a, token_a = make_user(test_db_session, "user-a", "a@test.com", "Alice Dev")
    user_b, _ = make_user(test_db_session, "user-b", "b@test.com", "Bob Creator")

    # Alice has React and FastAPI skills
    profile_a = IndividualProfile(
        user_id=user_a.id,
        skills=["React", "FastAPI", "PostgreSQL"],
        services=["Full Stack Development"],
        industry="FinTech",
        visibility=ProfileVisibility.PUBLIC.value,
    )
    test_db_session.add(profile_a)
    test_db_session.commit()

    # Bob has two published opportunities: one matching Alice's skills, one in Agriculture
    opp_match = create_test_opportunity(
        test_db_session,
        "opp-fintech-1",
        user_b.id,
        "Real-Time Payments Gateway",
        intent=OpportunityIntent.SEEKING_SOLUTION,
        industry="FinTech",
        required_skills=["FastAPI", "React", "Docker"],
    )
    opp_agri = create_test_opportunity(
        test_db_session,
        "opp-agri-1",
        user_b.id,
        "Drone Soil Sensor",
        intent=OpportunityIntent.SEEKING_SOLUTION,
        industry="Agriculture",
        required_skills=["Embedded C", "Agronomy"],
    )

    # Alice queries recommended opportunities
    resp = client_with_db.get(
        "/api/v1/matches/opportunities",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2

    # First item should be the fintech opportunity with higher match score
    first_item = data["items"][0]
    assert first_item["id"] == opp_match.id
    assert first_item["explanation"]["match_tier"] in ["STRONG_MATCH", "MODERATE_MATCH"]
    assert any(
        "FastAPI" in s or "React" in s
        for s in first_item["explanation"]["strong_signals"]
    )
    assert any("FinTech" in s for s in first_item["explanation"]["strong_signals"])

    # Second item should be agri opportunity with lower tier
    second_item = data["items"][1]
    assert second_item["id"] == opp_agri.id
    assert second_item["explanation"]["match_tier"] == "EXPLORATORY"


def test_self_exclusion_in_matching(
    client_with_db: TestClient, test_db_session: Session
):
    """User's own published opportunities must never be returned in their own recommendations."""
    user_a, token_a = make_user(test_db_session, "user-a", "a@test.com", "Alice Dev")
    user_b, _ = make_user(test_db_session, "user-b", "b@test.com", "Bob Creator")

    # Both Alice and Bob have published opportunities
    create_test_opportunity(
        test_db_session, "opp-alice", user_a.id, "Alice's Startup", industry="FinTech"
    )
    opp_bob = create_test_opportunity(
        test_db_session, "opp-bob", user_b.id, "Bob's Project", industry="FinTech"
    )

    resp = client_with_db.get(
        "/api/v1/matches/opportunities",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    returned_ids = [item["id"] for item in data["items"]]
    assert opp_bob.id in returned_ids
    assert "opp-alice" not in returned_ids  # Self excluded!


def test_unpublished_opportunities_excluded_from_matching(
    client_with_db: TestClient, test_db_session: Session
):
    """Draft, closed, or non-published opportunities are excluded from recommendations."""
    _, token_a = make_user(test_db_session, "user-a", "a@test.com", "Alice Dev")
    user_b, _ = make_user(test_db_session, "user-b", "b@test.com", "Bob Creator")

    # Bob creates one DRAFT and one CLOSED opportunity
    create_test_opportunity(
        test_db_session,
        "opp-draft",
        user_b.id,
        "Draft Idea",
        status=OpportunityStatus.DRAFT,
    )
    opp_closed = create_test_opportunity(
        test_db_session,
        "opp-closed",
        user_b.id,
        "Closed Opportunity",
        status=OpportunityStatus.PUBLISHED,
    )
    opp_closed.closed_at = datetime.now(UTC)
    test_db_session.commit()

    resp = client_with_db.get(
        "/api/v1/matches/opportunities",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def test_candidate_participants_for_opportunity(
    client_with_db: TestClient, test_db_session: Session
):
    """Creator queries candidate participants for their published opportunity."""
    creator, creator_token = make_user(test_db_session, "creator-1", "creator@test.com")
    candidate_1, _ = make_user(
        test_db_session, "cand-1", "cand1@test.com", "Carol Blockchain Dev"
    )
    candidate_2, _ = make_user(
        test_db_session, "cand-2", "cand2@test.com", "Dave Secretive"
    )

    # Opportunity requiring Solidity & Rust
    opp = create_test_opportunity(
        test_db_session,
        "opp-crypto-1",
        creator.id,
        "DeFi Vault",
        industry="Crypto",
        required_skills=["Solidity", "Rust"],
    )

    # Candidate 1: Public profile with Solidity
    test_db_session.add(
        IndividualProfile(
            user_id=candidate_1.id,
            skills=["Solidity", "Smart Contracts"],
            industry="Crypto",
            visibility=ProfileVisibility.PUBLIC.value,
        )
    )
    # Candidate 2: PRIVATE profile with Rust (MUST BE EXCLUDED!)
    test_db_session.add(
        IndividualProfile(
            user_id=candidate_2.id,
            skills=["Rust", "Cryptography"],
            industry="Crypto",
            visibility=ProfileVisibility.PRIVATE.value,
        )
    )
    # Also add a business candidate
    biz = Business(
        name="CryptoForge Labs",
        user_id="biz-owner-id",
        skills=["Solidity", "Rust", "Auditing"],
        industry="Crypto",
        visibility="PUBLIC",
    )
    test_db_session.add(biz)
    test_db_session.commit()

    resp = client_with_db.get(
        f"/api/v1/matches/participants/{opp.id}",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["opportunity_id"] == opp.id

    candidate_names = [c["name"] for c in data["items"]]
    assert "Carol Blockchain Dev" in candidate_names
    assert "CryptoForge Labs" in candidate_names
    # Private candidate Dave must be excluded!
    assert "Dave Secretive" not in candidate_names
    # Creator themselves must not be in candidate list
    assert "Test User" not in candidate_names


def test_non_owner_cannot_query_candidate_participants(
    client_with_db: TestClient, test_db_session: Session
):
    """Non-owner querying candidate participants receives 403 Forbidden."""
    creator, _ = make_user(test_db_session, "creator-1", "creator@test.com")
    _, other_token = make_user(test_db_session, "other-1", "other@test.com")

    opp = create_test_opportunity(
        test_db_session, "opp-1", creator.id, "Secret Opportunity"
    )

    resp = client_with_db.get(
        f"/api/v1/matches/participants/{opp.id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403
    assert "Only the creator" in resp.json()["detail"]


def test_complementary_opportunities_matching(
    client_with_db: TestClient, test_db_session: Session
):
    """Complementary matching pairs SEEKING_SOLUTION with OFFERING_SOLUTION."""
    user_a, _ = make_user(test_db_session, "user-a", "a@test.com")
    user_b, _ = make_user(test_db_session, "user-b", "b@test.com")

    # Opp A is SEEKING_SOLUTION in Logistics
    opp_a = create_test_opportunity(
        test_db_session,
        "opp-a",
        user_a.id,
        "Need Cold Chain Sensor Network",
        intent=OpportunityIntent.SEEKING_SOLUTION,
        industry="Logistics",
        required_skills=["IoT", "Cold Storage", "Telemetry"],
    )

    # Opp B is OFFERING_SOLUTION in Logistics
    opp_b = create_test_opportunity(
        test_db_session,
        "opp-b",
        user_b.id,
        "Turnkey IoT Sensor Deployment Service",
        intent=OpportunityIntent.OFFERING_SOLUTION,
        industry="Logistics",
        required_skills=["IoT", "Telemetry", "Fleet Monitoring"],
    )

    # Opp C is also SEEKING_SOLUTION in Logistics (same intent, not complementary)
    create_test_opportunity(
        test_db_session,
        "opp-c",
        user_b.id,
        "Seeking Warehouse Space",
        intent=OpportunityIntent.SEEKING_SOLUTION,
        industry="Logistics",
    )

    resp = client_with_db.get(f"/api/v1/matches/complementary/{opp_a.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == opp_b.id
    assert data["items"][0]["intent"] == OpportunityIntent.OFFERING_SOLUTION.value
    assert any(
        "Complementary intent" in s
        for s in data["items"][0]["explanation"]["strong_signals"]
    )


def test_gemini_live_ai_enrichment_mock(
    client_with_db: TestClient, test_db_session: Session
):
    """When Gemini API succeeds, responses are labeled LIVE_AI and AI_INFERRED."""
    user_a, token_a = make_user(test_db_session, "user-a", "a@test.com")
    user_b, _ = make_user(test_db_session, "user-b", "b@test.com")

    test_db_session.add(
        IndividualProfile(
            user_id=user_a.id,
            skills=["Python", "FastAPI"],
            industry="FinTech",
            visibility=ProfileVisibility.PUBLIC.value,
        )
    )
    create_test_opportunity(
        test_db_session,
        "opp-b",
        user_b.id,
        "Banking API Integration",
        industry="FinTech",
        required_skills=["FastAPI"],
    )

    fake_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": (
                                '{"explanation_summary": "Exceptional fit due to direct FastAPI expertise '
                                'in FinTech.", "strong_signals": ["FastAPI competency"], "partial_signals": [], '
                                '"missing_information": [], "potential_gaps": []}'
                            )
                        }
                    ]
                }
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = fake_gemini_response
    mock_resp.raise_for_status = MagicMock()

    with (
        patch("app.core.config.settings.AI_API_KEY", "fake-gemini-key"),
        patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp),
    ):
        resp = client_with_db.get(
            "/api/v1/matches/opportunities",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == "LIVE_AI"
        item = data["items"][0]
        assert item["explanation"]["mode"] == "LIVE_AI"
        assert item["explanation"]["provenance"] == "AI_INFERRED"
        assert "Exceptional fit" in item["explanation"]["explanation_summary"]
