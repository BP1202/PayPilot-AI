"""add business profile fields and user association

Revision ID: 002_add_business_profile_fields
Revises: 001_initial_schema
Create Date: 2026-11-03 22:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_business_profile_fields"
down_revision: str | Sequence[str] | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("business_type", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("country", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("website", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("user_id", sa.String(length=100), nullable=True),
    )
    op.alter_column(
        "businesses",
        "description",
        type_=sa.String(length=1000),
        existing_type=sa.String(length=500),
        nullable=True,
    )
    op.create_index(
        op.f("ix_businesses_user_id"), "businesses", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_businesses_user_id"), table_name="businesses")
    op.alter_column(
        "businesses",
        "description",
        type_=sa.String(length=500),
        existing_type=sa.String(length=1000),
        nullable=True,
    )
    op.drop_column("businesses", "user_id")
    op.drop_column("businesses", "website")
    op.drop_column("businesses", "country")
    op.drop_column("businesses", "business_type")
