"""add opportunity publishing and lifecycle controls

Revision ID: 007_add_opportunity_publishing_and_lifecycle
Revises: 006_add_profile_system
Create Date: 2026-11-05 01:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007_add_opportunity_publishing_and_lifecycle"
down_revision: str | Sequence[str] | None = "006_add_profile_system"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "opportunities",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "opportunities",
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_opportunities_visibility"),
        "opportunities",
        ["visibility"],
        unique=False,
    )
    op.create_index(
        op.f("ix_opportunities_published_at"),
        "opportunities",
        ["published_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_opportunities_published_at"), table_name="opportunities")
    op.drop_index(op.f("ix_opportunities_visibility"), table_name="opportunities")
    op.drop_column("opportunities", "closed_at")
    op.drop_column("opportunities", "published_at")
