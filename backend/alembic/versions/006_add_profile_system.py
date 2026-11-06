"""add profile system (individual profiles and extended business profiles)

Revision ID: 006_add_profile_system
Revises: 005_add_opportunity_intent_and_category
Create Date: 2026-11-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006_add_profile_system"
down_revision: str | Sequence[str] | None = "005_add_opportunity_intent_and_category"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create individual_profiles table
    op.create_table(
        "individual_profiles",
        sa.Column(
            "user_id",
            sa.String(length=64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("headline", sa.String(length=255), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("experience", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("services", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("resources", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("interests", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column(
            "visibility",
            sa.String(length=30),
            nullable=False,
            server_default="PRIVATE",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    # 2. Add columns to businesses table
    op.add_column(
        "businesses",
        sa.Column("location", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column(
            "visibility",
            sa.String(length=30),
            nullable=False,
            server_default="PRIVATE",
        ),
    )
    op.add_column(
        "businesses",
        sa.Column("skills", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "businesses",
        sa.Column("experience", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "businesses",
        sa.Column("services", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "businesses",
        sa.Column("resources", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "businesses",
        sa.Column("interests", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("businesses", "interests")
    op.drop_column("businesses", "resources")
    op.drop_column("businesses", "services")
    op.drop_column("businesses", "experience")
    op.drop_column("businesses", "skills")
    op.drop_column("businesses", "visibility")
    op.drop_column("businesses", "location")
    op.drop_table("individual_profiles")
