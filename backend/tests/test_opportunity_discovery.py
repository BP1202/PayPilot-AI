import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.business import Business
from app.models.user import User


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


def make_business(db: Session, user_id: str, name: str) -> Business:
    biz = Business(
        user_id=user_id,
        name=name,
        currency="USD",
        industry="Technology",
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


def create_and_publish_opportunity(
    client: TestClient, token: str, visibility: str = "PUBLIC", **kwargs
) -> dict:
    payload = {
        "title": kwargs.get("title", "Autonomous Fleet Dispatching Platform"),
        "original_description": kwargs.get(
            "original_description",
            "An AI-powered dispatch optimization platform for regional trucking logistics.",
        ),
        "submission_type": kwargs.get("submission_type", "IDEA"),
        "intent": kwargs.get("intent", "OFFERING_SOLUTION"),
        "category": kwargs.get("category", "TECH"),
        "industry": kwargs.get("industry", "Logistics & Freight"),
        "proposed_solution": kwargs.get(
            "proposed_solution",
            "Dynamic route clustering and algorithmic load matching.",
        ),
        "problem_statement": kwargs.get(
            "problem_statement",
            "Mid-sized freight carriers suffer 25% deadhead miles.",
        ),
        "target_customer_segments": kwargs.get(
            "target_customer_segments", ["Regional Carriers", "Freight Dispatchers"]
        ),
        "required_skills_and_resources": kwargs.get(
            "required_skills_and_resources", ["Python", "FastAPI", "Route Optimization"]
        ),
        "value_proposition": kwargs.get(
            "value_proposition", "Reduce deadhead mileage by 18%."
        ),
        "visibility": "PRIVATE",
        "business_id": kwargs.get("business_id", None),
    }
    create_res = client.post(
        "/api/v1/opportunities",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert create_res.status_code == 201
    draft = create_res.json()

    # Publish with requested visibility
    pub_res = client.post(
        f"/api/v1/opportunities/{draft['id']}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"visibility": visibility},
    )
    assert pub_res.status_code == 200
    return pub_res.json()


# ---------------------------------------------------------------------------
# 1. Authorization & Visibility Isolation in Discovery Feed
# ---------------------------------------------------------------------------


def test_public_guest_vs_authenticated_member_discovery(
    client_with_db, test_db_session
):
    _, creator_token = make_user(test_db_session, "creator_1", "creator1@demo.io")
    _, member_token = make_user(test_db_session, "member_1", "member1@demo.io")

    # 1. PUBLIC published opportunity
    create_and_publish_opportunity(
        client_with_db,
        creator_token,
        visibility="PUBLIC",
        title="Solar Microgrid Orchestrator",
        industry="Clean Energy",
    )

    # 2. AUTHENTICATED (Members-Only) published opportunity
    create_and_publish_opportunity(
        client_with_db,
        creator_token,
        visibility="AUTHENTICATED",
        title="Aerospace Carbon Composite Sensor",
        industry="Aerospace",
    )

    # 3. Unpublished Private Draft
    client_with_db.post(
        "/api/v1/opportunities",
        headers={"Authorization": f"Bearer {creator_token}"},
        json={
            "title": "Secret Quantum Encryption Idea",
            "original_description": "Proprietary unpublished quantum algorithms.",
            "submission_type": "IDEA",
            "intent": "OFFERING_SOLUTION",
            "category": "TECH",
            "industry": "Cybersecurity",
            "visibility": "PRIVATE",
        },
    )

    # Guest requests feed: must ONLY see the PUBLIC opportunity
    guest_res = client_with_db.get("/api/v1/opportunities/published")
    assert guest_res.status_code == 200
    guest_feed = guest_res.json()
    assert guest_feed["total"] == 1
    assert guest_feed["page"] == 1
    assert guest_feed["pages"] == 1
    assert len(guest_feed["items"]) == 1
    assert guest_feed["items"][0]["title"] == "Solar Microgrid Orchestrator"
    assert guest_feed["items"][0]["visibility"] == "PUBLIC"

    # Authenticated member requests feed: sees both PUBLIC and AUTHENTICATED
    member_res = client_with_db.get(
        "/api/v1/opportunities/published",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert member_res.status_code == 200
    member_feed = member_res.json()
    assert member_feed["total"] == 2
    titles = [item["title"] for item in member_feed["items"]]
    assert "Solar Microgrid Orchestrator" in titles
    assert "Aerospace Carbon Composite Sensor" in titles
    assert "Secret Quantum Encryption Idea" not in titles


def test_closed_opportunities_are_never_in_discovery_feed(
    client_with_db, test_db_session
):
    _, creator_token = make_user(test_db_session, "creator_closed", "closed@demo.io")
    opp = create_and_publish_opportunity(
        client_with_db,
        creator_token,
        visibility="PUBLIC",
        title="Completed Medical Triage Bot",
        industry="Healthcare",
    )

    # Close opportunity
    close_res = client_with_db.post(
        f"/api/v1/opportunities/{opp['id']}/close",
        headers={"Authorization": f"Bearer {creator_token}"},
        json={"reason": "Pilot completed successfully."},
    )
    assert close_res.status_code == 200

    # Feed must be empty
    feed = client_with_db.get("/api/v1/opportunities/published").json()
    assert feed["total"] == 0
    assert len(feed["items"]) == 0


# ---------------------------------------------------------------------------
# 2. Parameterized Keyword Search (q)
# ---------------------------------------------------------------------------


def test_keyword_search_across_fields(client_with_db, test_db_session):
    _, token = make_user(test_db_session, "creator_search", "search@demo.io")

    # Opportunity 1: matches keyword in title
    create_and_publish_opportunity(
        client_with_db,
        token,
        title="AgriDrone Crop Inspection",
        industry="Agriculture",
        proposed_solution="Multispectral drone flights over fields.",
        required_skills_and_resources=["Drone Piloting", "Computer Vision"],
    )

    # Opportunity 2: matches keyword in proposed solution
    create_and_publish_opportunity(
        client_with_db,
        token,
        title="Precision Fertilizer Dispenser",
        industry="Hardware",
        proposed_solution="Autonomous robots providing automated crop health monitoring.",
        required_skills_and_resources=["Embedded Systems", "Robotics"],
    )

    # Opportunity 3: matches keyword in required skills
    create_and_publish_opportunity(
        client_with_db,
        token,
        title="Soil Moisture IoT Sensor Network",
        industry="Hardware",
        proposed_solution="LoRaWAN ground probes reporting telemetry.",
        required_skills_and_resources=["LoRaWAN", "AgriDrone Fleet Integration"],
    )

    # Search for "Crop": should match #1 (title) and #2 (solution)
    res_crop = client_with_db.get("/api/v1/opportunities/published?q=crop").json()
    assert res_crop["total"] == 2
    crop_titles = [i["title"] for i in res_crop["items"]]
    assert "AgriDrone Crop Inspection" in crop_titles
    assert "Precision Fertilizer Dispenser" in crop_titles

    # Search for "LoRaWAN": should match #3 (skills/solution)
    res_lora = client_with_db.get("/api/v1/opportunities/published?q=lorawan").json()
    assert res_lora["total"] == 1
    assert res_lora["items"][0]["title"] == "Soil Moisture IoT Sensor Network"

    # Search for non-existent keyword: 0 results
    res_none = client_with_db.get(
        "/api/v1/opportunities/published?q=NonExistentQuantumWidget"
    ).json()
    assert res_none["total"] == 0
    assert len(res_none["items"]) == 0


# ---------------------------------------------------------------------------
# 3. Filtering by Intent, Category, Industry, and Skill
# ---------------------------------------------------------------------------


def test_filters_intent_category_industry_skill(client_with_db, test_db_session):
    _, token = make_user(test_db_session, "creator_filter", "filter@demo.io")

    # Opp A: SEEKING_SOLUTION, FINTECH, Banking, Python
    create_and_publish_opportunity(
        client_with_db,
        token,
        title="Core Banking API Gateway",
        intent="SEEKING_SOLUTION",
        category="FINTECH",
        industry="Banking & Payments",
        required_skills_and_resources=["Python", "PCI-DSS", "Docker"],
    )

    # Opp B: OFFERING_SOLUTION, TECH, Logistics, React
    create_and_publish_opportunity(
        client_with_db,
        token,
        title="Custom Freight Route Dashboard",
        intent="OFFERING_SOLUTION",
        category="TECH",
        industry="Logistics & Freight",
        required_skills_and_resources=["React", "TypeScript", "Tailwind"],
    )

    # Opp C: OFFERING_SOLUTION, BUSINESS, Consulting, Management
    create_and_publish_opportunity(
        client_with_db,
        token,
        title="Supply Chain Risk Advisory",
        intent="OFFERING_SOLUTION",
        category="BUSINESS",
        industry="Professional Services",
        required_skills_and_resources=["Supply Chain", "Auditing"],
    )

    # Filter by intent = SEEKING_SOLUTION
    res_intent = client_with_db.get(
        "/api/v1/opportunities/published?intent=SEEKING_SOLUTION"
    ).json()
    assert res_intent["total"] == 1
    assert res_intent["items"][0]["title"] == "Core Banking API Gateway"

    # Filter by category = TECH
    res_cat = client_with_db.get("/api/v1/opportunities/published?category=TECH").json()
    assert res_cat["total"] == 1
    assert res_cat["items"][0]["title"] == "Custom Freight Route Dashboard"

    # Filter by industry = Logistics
    res_ind = client_with_db.get(
        "/api/v1/opportunities/published?industry=Logistics"
    ).json()
    assert res_ind["total"] == 1
    assert res_ind["items"][0]["title"] == "Custom Freight Route Dashboard"

    # Filter by skill = PCI-DSS
    res_skill = client_with_db.get(
        "/api/v1/opportunities/published?skill=PCI-DSS"
    ).json()
    assert res_skill["total"] == 1
    assert res_skill["items"][0]["title"] == "Core Banking API Gateway"

    # Combined matching: intent=OFFERING_SOLUTION & category=TECH & skill=React
    res_comb = client_with_db.get(
        "/api/v1/opportunities/published?intent=OFFERING_SOLUTION&category=TECH&skill=React"
    ).json()
    assert res_comb["total"] == 1
    assert res_comb["items"][0]["title"] == "Custom Freight Route Dashboard"

    # Combined mismatch: intent=SEEKING_SOLUTION & category=BUSINESS -> 0
    res_mismatch = client_with_db.get(
        "/api/v1/opportunities/published?intent=SEEKING_SOLUTION&category=BUSINESS"
    ).json()
    assert res_mismatch["total"] == 0


# ---------------------------------------------------------------------------
# 4. Sorting and Pagination
# ---------------------------------------------------------------------------


def test_sorting_and_pagination(client_with_db, test_db_session):
    _, token = make_user(test_db_session, "creator_page", "page@demo.io")

    for i in range(5):
        create_and_publish_opportunity(
            client_with_db,
            token,
            title=f"Platform Release Item #{i + 1}",
            industry="Cloud Computing",
        )

    # Test limit and page calculation
    page_1 = client_with_db.get(
        "/api/v1/opportunities/published?page=1&limit=2&sort=newest"
    ).json()
    assert page_1["total"] == 5
    assert page_1["page"] == 1
    assert page_1["limit"] == 2
    assert page_1["pages"] == 3
    assert len(page_1["items"]) == 2

    page_2 = client_with_db.get(
        "/api/v1/opportunities/published?page=2&limit=2&sort=newest"
    ).json()
    assert page_2["total"] == 5
    assert page_2["page"] == 2
    assert len(page_2["items"]) == 2

    # Disjoint sets between pages
    page_1_ids = {item["id"] for item in page_1["items"]}
    page_2_ids = {item["id"] for item in page_2["items"]}
    assert page_1_ids.isdisjoint(page_2_ids)

    # Sort oldest: first item should be Item #1
    oldest_feed = client_with_db.get(
        "/api/v1/opportunities/published?sort=oldest&limit=5"
    ).json()
    assert oldest_feed["items"][0]["title"] == "Platform Release Item #1"


# ---------------------------------------------------------------------------
# 5. Security & Sensitive Field Exclusion
# ---------------------------------------------------------------------------


def test_discovery_schema_excludes_sensitive_internal_fields(
    client_with_db, test_db_session
):
    user, token = make_user(test_db_session, "creator_secure_id", "secure@demo.io")
    biz = make_business(test_db_session, user.id, "Acme Robotics Inc.")

    create_and_publish_opportunity(
        client_with_db,
        token,
        title="Acme High Precision Robotic Arm",
        business_id=biz.id,
    )

    feed = client_with_db.get("/api/v1/opportunities/published").json()
    assert feed["total"] == 1
    item = feed["items"][0]

    # Verify public fields are populated
    assert item["title"] == "Acme High Precision Robotic Arm"
    assert item["business_name"] == "Acme Robotics Inc."
    assert item["business_id"] == biz.id

    # Strictly assert sensitive internal fields are NOT present
    assert "user_id" not in item
    assert "provenance" not in item
    assert "ai_metadata" not in item
    assert "raw_input" not in item
