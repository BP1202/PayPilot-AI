from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.security import verify_password
from app.models import (
    Business,
    DealRoom,
    IndividualProfile,
    MilestoneExecution,
    Opportunity,
    Transaction,
    User,
)
from app.services.settlement_role_validator import SettlementRoleValidator
from scripts.seed_demo_data import (
    DEMO_MILESTONE_ID,
    DEMO_ROOM_ID,
    seed_demo_data,
    validate_local_seed_environment,
)


@pytest.fixture
def demo_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_seed_creates_six_distinct_profiles_and_sandbox_ready_workflow(demo_db):
    password = "LocalDemoPass123!"
    summary = seed_demo_data(demo_db, password)

    assert len(summary.accounts) == 6
    assert len(set(summary.accounts)) == 6
    assert len(summary.organizations) == 3
    assert len(summary.solver_profiles) == 3
    assert demo_db.query(User).count() == 6
    assert demo_db.query(IndividualProfile).count() == 6
    assert demo_db.query(Business).count() == 3
    assert demo_db.query(Opportunity).count() == 6
    assert all(
        email.endswith("@opnly-demo.test")
        for email in summary.accounts
    )
    assert verify_password(
        password,
        demo_db.query(User).filter_by(id="demo_org_northstar").one().hashed_password,
    )

    room = demo_db.get(DealRoom, DEMO_ROOM_ID)
    milestone = demo_db.get(MilestoneExecution, DEMO_MILESTONE_ID)
    assert room is not None
    assert milestone is not None
    assert milestone.status == "APPROVED"
    assert milestone.payment_readiness == "READY_FOR_PAYMENT_REVIEW"
    assert milestone.agreed_amount == Decimal("25.00")

    roles = SettlementRoleValidator().validate_settlement_roles(
        demo_db,
        caller_user_id="demo_org_northstar",
        room_id=DEMO_ROOM_ID,
        milestone_id=DEMO_MILESTONE_ID,
    )
    assert roles.payer_user_id == "demo_org_northstar"
    assert roles.payee_user_id == "demo_solver_priya"

    transaction = (
        demo_db.query(Transaction)
        .filter(Transaction.milestone_id == DEMO_MILESTONE_ID)
        .one()
    )
    assert transaction.status.value == "PENDING"
    assert transaction.paypal_order_id is None
    assert transaction.amount == Decimal("25.00")


def test_seed_is_idempotent_and_does_not_reset_existing_credentials(demo_db):
    first_password = "LocalDemoPass123!"
    seed_demo_data(demo_db, first_password)
    original_hash = demo_db.get(User, "demo_org_northstar").hashed_password

    seed_demo_data(demo_db, "DifferentDemoPass456!")

    assert demo_db.query(User).count() == 6
    assert demo_db.query(Business).count() == 3
    assert demo_db.query(Opportunity).count() == 6
    assert demo_db.query(DealRoom).count() == 1
    assert demo_db.get(User, "demo_org_northstar").hashed_password == original_hash


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"confirmed": False}, "confirm-local-demo-seed"),
        ({"app_env": "production"}, "APP_ENV"),
        ({"database_url": "postgresql://db.example.com/prod"}, "local database"),
        ({"database_url": "postgresql://localhost/app_production"}, "production/live"),
        ({"paypal_environment": "live"}, "PAYPAL_ENVIRONMENT"),
        (
            {"paypal_base_url": "https://api-m.paypal.com"},
            "Sandbox API URL",
        ),
        ({"paypal_client_secret": ""}, "Sandbox credentials"),
    ],
)
def test_cli_safety_checks_reject_unsafe_targets(overrides, message):
    options = {
        "confirmed": True,
        "app_env": "development",
        "database_url": "postgresql://localhost/opnly_dev",
        "paypal_environment": "sandbox",
        "paypal_base_url": "https://api-m.sandbox.paypal.com",
        "paypal_client_id": "sandbox-client-id",
        "paypal_client_secret": "sandbox-client-secret",
    }
    options.update(overrides)

    with pytest.raises(ValueError, match=message):
        validate_local_seed_environment(**options)
