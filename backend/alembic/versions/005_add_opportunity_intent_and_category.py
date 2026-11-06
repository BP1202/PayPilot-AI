"""add opportunity intent and category for two-sided opportunity network

Revision ID: 005_add_opportunity_intent_and_category
Revises: 004_add_users_table
Create Date: 2026-11-04 20:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005_add_opportunity_intent_and_category"
down_revision: str | Sequence[str] | None = "004_add_users_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "opportunities",
        sa.Column(
            "intent",
            sa.String(length=30),
            nullable=False,
            server_default="SEEKING_SOLUTION",
        ),
    )
    op.add_column(
        "opportunities",
        sa.Column(
            "category",
            sa.String(length=30),
            nullable=False,
            server_default="BUSINESS",
        ),
    )
    op.create_index(
        op.f("ix_opportunities_intent"),
        "opportunities",
        ["intent"],
        unique=False,
    )
    op.create_index(
        op.f("ix_opportunities_category"),
        "opportunities",
        ["category"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_opportunities_category"), table_name="opportunities")
    op.drop_index(op.f("ix_opportunities_intent"), table_name="opportunities")
    op.drop_column("opportunities", "category")
    op.drop_column("opportunities", "intent")
