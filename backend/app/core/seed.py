from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.repositories.business_repository import BusinessRepository
from app.repositories.user_repository import UserRepository


def seed_demo_data(db: Session) -> Business:
    """Seed the database with realistic demo data for Apex Precision Gearworks."""
    # Ensure seed user exists for demo and testing environments
    user_repo = UserRepository(db)
    user_repo.get_or_create_seed_user(
        user_id="owner_default",
        email="owner@apexgearworks.demo",
        password="Password123!",
        full_name="Apex Gearworks Owner",
    )

    biz_repo = BusinessRepository(db)
    business = biz_repo.get_or_create_default_business(
        name="Apex Precision Gearworks",
        currency="USD",
        industry="Precision Machining & Robotics Manufacturing",
        description="Demo manufacturer specialized in custom CNC components and robotic drivetrain assemblies.",
        user_id="owner_default",
    )

    # Check if seed transactions already exist
    existing_count = (
        db.query(Transaction).filter(Transaction.business_id == business.id).count()
    )
    if existing_count > 0:
        return business

    demo_transactions = [
        Transaction(
            transaction_ref="TXN-DEMO-202611-001",
            business_id=business.id,
            amount=Decimal("4250.00"),
            currency="USD",
            status=TransactionStatus.COMPLETED,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method="PAYPAL_SIMULATED",
            description="Invoice #1042 - Custom Titanium Helical Gears (Lot of 50)",
            customer_name="AeroDrive Systems",
            customer_email="procurement@aerodrive.demo",
            provider_reference="SIM-PAYPAL-CAP-001",
        ),
        Transaction(
            transaction_ref="TXN-DEMO-202611-002",
            business_id=business.id,
            amount=Decimal("1890.50"),
            currency="USD",
            status=TransactionStatus.COMPLETED,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method="PAYPAL_SIMULATED",
            description="Invoice #1043 - Planetary Gearbox Housing Prototyping",
            customer_name="Kinetic Motion Labs",
            customer_email="engineering@kineticmotion.demo",
            provider_reference="SIM-PAYPAL-CAP-002",
        ),
        Transaction(
            transaction_ref="TXN-DEMO-202611-003",
            business_id=business.id,
            amount=Decimal("3120.00"),
            currency="USD",
            status=TransactionStatus.COMPLETED,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method="PAYPAL_SIMULATED",
            description="Invoice #1044 - Hardened Steel Spur Gears Batch",
            customer_name="Vanguard Automation",
            customer_email="accounts@vanguardauto.demo",
            provider_reference="SIM-PAYPAL-CAP-003",
        ),
        Transaction(
            transaction_ref="TXN-DEMO-202611-004",
            business_id=business.id,
            amount=Decimal("875.25"),
            currency="USD",
            status=TransactionStatus.COMPLETED,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method="PAYPAL_SIMULATED",
            description="Invoice #1045 - Precision Shaft Calibration Service",
            customer_name="Apex Precision Lab Internal",
            customer_email="qa@apexgearworks.demo",
            provider_reference="SIM-PAYPAL-CAP-004",
        ),
        Transaction(
            transaction_ref="TXN-DEMO-202611-005",
            business_id=business.id,
            amount=Decimal("2650.00"),
            currency="USD",
            status=TransactionStatus.PENDING,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method="PAYPAL_SIMULATED",
            description="Invoice #1046 - Robotic Arm Drivetrain Assembly (Milestone 1)",
            customer_name="Stratos Dynamics",
            customer_email="payments@stratosdyn.demo",
            provider_reference=None,
        ),
    ]

    for tx in demo_transactions:
        db.add(tx)

    db.commit()
    db.refresh(business)
    return business
