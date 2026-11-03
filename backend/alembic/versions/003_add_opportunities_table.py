"""add opportunities table for idea capture and analysis

Revision ID: 003_add_opportunities_table
Revises: 002_add_business_profile_fields
Create Date: 2026-11-04 00:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_add_opportunities_table"
down_revision: str | Sequence[str] | None = "002_add_business_profile_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "opportunities",
        sa.Column("id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=True),
        sa.Column("submission_type", sa.String(length=20), nullable=False, server_default="IDEA"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="DRAFT"),
        sa.Column("visibility", sa.String(length=20), nullable=False, server_default="PRIVATE"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("original_description", sa.Text(), nullable=False),
        sa.Column("problem_statement", sa.Text(), nullable=True),
        sa.Column("proposed_solution", sa.Text(), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("value_proposition", sa.Text(), nullable=True),
        sa.Column("target_customer_segments", sa.JSON(), nullable=False),
        sa.Column("customer_pain_points", sa.JSON(), nullable=False),
        sa.Column("required_skills_and_resources", sa.JSON(), nullable=False),
        sa.Column("potential_business_models", sa.JSON(), nullable=False),
        sa.Column("key_assumptions", sa.JSON(), nullable=False),
        sa.Column("risks_and_uncertainties", sa.JSON(), nullable=False),
        sa.Column("missing_information", sa.JSON(), nullable=False),
        sa.Column("suggested_follow_up_questions", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("ai_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_opportunities_user_id"), "opportunities", ["user_id"], unique=False)
    op.create_index(op.f("ix_opportunities_business_id"), "opportunities", ["business_id"], unique=False)
    op.create_index(op.f("ix_opportunities_status"), "opportunities", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_opportunities_status"), table_name="opportunities")
    op.drop_index(op.f("ix_opportunities_business_id"), table_name="opportunities")
    op.drop_index(op.f("ix_opportunities_user_id"), table_name="opportunities")
    op.drop_table("opportunities")

