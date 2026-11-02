"""create initial businesses and transactions schema

Revision ID: 001_initial_schema
Revises: None
Create Date: 2026-11-01 23:45:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create businesses table
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), nullable=False, server_default="USD"
        ),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_businesses_name"), "businesses", ["name"], unique=False)

    # Create transactions table
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("transaction_ref", sa.String(length=64), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), nullable=False, server_default="USD"
        ),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING", "COMPLETED", "FAILED", "CANCELLED", name="transactionstatus"
            ),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column(
            "type",
            sa.Enum("CUSTOMER_PAYMENT", "REFUND", name="transactiontype"),
            nullable=False,
            server_default="CUSTOMER_PAYMENT",
        ),
        sa.Column(
            "payment_method",
            sa.String(length=50),
            nullable=False,
            server_default="PAYPAL_SIMULATED",
        ),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("customer_name", sa.String(length=100), nullable=True),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("provider_reference", sa.String(length=128), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_transactions_business_id"),
        "transactions",
        ["business_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transactions_created_at"), "transactions", ["created_at"], unique=False
    )
    op.create_index(
        op.f("ix_transactions_status"), "transactions", ["status"], unique=False
    )
    op.create_index(
        op.f("ix_transactions_transaction_ref"),
        "transactions",
        ["transaction_ref"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_transactions_transaction_ref"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_status"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_created_at"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_business_id"), table_name="transactions")
    op.drop_table("transactions")
    op.execute(sa.text("DROP TYPE IF EXISTS transactionstatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS transactiontype"))

    op.drop_index(op.f("ix_businesses_name"), table_name="businesses")
    op.drop_table("businesses")
