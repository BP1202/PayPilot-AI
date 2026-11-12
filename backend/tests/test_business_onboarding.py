import pytest
from app.core.database import Base, get_db
from app.main import app
from app.services.business_extractor import BusinessProfileExtractor
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


def test_extractor_sample_description():
    extractor = BusinessProfileExtractor()
    sample_text = (
        "ABC Company is an electronics wholesaler based in Ahmedabad, India. "
        "We sell electronic components to retailers and receive payments online."
    )
    res = extractor.extract(sample_text)

    assert res.name == "ABC Company"
    assert res.industry == "Electronics"
    assert res.business_type == "Wholesaler"
    assert res.country == "India"
    assert res.currency == "INR"
    assert (
        res.website == ""
    )  # Anti-hallucination: No website supplied, must remain blank!
    assert "ABC Company" in res.description
    assert "name" in res.extracted_fields
    assert "website" not in res.extracted_fields


def test_extractor_with_website_and_custom_currency():
    extractor = BusinessProfileExtractor()
    sample_text = (
        "Starlight Logistics LLC is a freight and transportation service provider in Toronto, Canada. "
        "Check our fleet at https://starlightlogistics.ca. We bill clients in CAD."
    )
    res = extractor.extract(sample_text)

    assert res.name == "Starlight Logistics LLC"
    assert res.industry == "Logistics & Freight"
    assert res.business_type == "Service Provider"
    assert res.country == "Canada"
    assert res.currency == "CAD"
    assert res.website == "https://starlightlogistics.ca"
    assert "website" in res.extracted_fields


def test_extractor_anti_hallucination_leaves_missing_blank():
    extractor = BusinessProfileExtractor()
    sample_text = "We are a small local bakery selling fresh sourdough bread."
    res = extractor.extract(sample_text)

    # Missing fields MUST remain blank, not invented
    assert res.name == ""
    assert res.country == ""
    assert res.website == ""
    assert res.business_type == ""
    assert res.industry == "Food & Beverage"
    assert res.currency == "USD"


def test_api_extract_endpoint(client_with_db):
    payload = {
        "description": "ABC Company is an electronics wholesaler based in Ahmedabad, India. We sell electronic components to retailers and receive payments online."
    }
    response = client_with_db.post("/api/v1/business/extract", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["name"] == "ABC Company"
    assert data["industry"] == "Electronics"
    assert data["business_type"] == "Wholesaler"
    assert data["country"] == "India"
    assert data["currency"] == "INR"
    assert data["website"] == ""


def test_create_and_retrieve_business_profile_for_authenticated_user(client_with_db):
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "owner987@abccompany.example.com",
            "password": "Password123!",
            "full_name": "Owner 987",
        },
    )
    user_id = reg_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    payload = {
        "name": "ABC Company",
        "description": "Electronics wholesale business",
        "industry": "Electronics",
        "business_type": "Wholesaler",
        "country": "India",
        "website": "https://abccompany.example.com",
        "currency": "INR",
    }

    # 1. Create profile
    create_res = client_with_db.post("/api/v1/business", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["id"] is not None
    assert created_data["name"] == "ABC Company"
    assert created_data["user_id"] == user_id
    assert created_data["currency"] == "INR"
    assert created_data["business_type"] == "Wholesaler"
    assert created_data["country"] == "India"
    assert created_data["website"] == "https://abccompany.example.com"

    # 2. Retrieve profile via /me
    me_res = client_with_db.get("/api/v1/business/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["id"] == created_data["id"]
    assert me_data["name"] == "ABC Company"
    assert me_data["user_id"] == user_id

    # 3. Retrieve via dashboard overview
    dash_res = client_with_db.get("/api/v1/dashboard/overview", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["business"]["name"] == "ABC Company"
    assert dash_data["business"]["currency"] == "INR"


def test_create_business_profile_manual_without_ai(client_with_db):
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "manual123@example.com",
            "password": "Password123!",
            "full_name": "Manual User",
        },
    )
    user_id = reg_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    payload = {
        "name": "Manual Artisan Crafts",
        "description": "Handmade leather goods",
        "industry": "Apparel & Fashion",
        "business_type": "Manufacturer",
        "country": "United States",
        "website": "",
        "currency": "USD",
    }

    create_res = client_with_db.post("/api/v1/business", json=payload, headers=headers)
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["name"] == "Manual Artisan Crafts"
    assert data["user_id"] == user_id
    assert data["website"] == ""
