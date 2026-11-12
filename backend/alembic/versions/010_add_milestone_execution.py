"""add milestone execution, deliverables and evidence verification

Revision ID: 010_add_milestone_execution
Revises: 009_add_deal_rooms
Create Date: 2026-11-06 02:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010_add_milestone_execution"
down_revision: str | None = "009_add_deal_rooms"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. deal_room_milestones table
    op.create_table(
        "deal_room_milestones",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_proposal_id",
            sa.String(64),
            sa.ForeignKey("proposals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("accepted_proposal_version", sa.Integer(), nullable=False),
        sa.Column("milestone_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("expected_deliverables", sa.JSON(), nullable=False),
        sa.Column("agreed_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("due_days", sa.Integer(), nullable=True),
        sa.Column("planned_due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "responsible_user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reviewer_user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default="NOT_STARTED",
        ),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column(
            "payment_readiness",
            sa.String(30),
            nullable=False,
            server_default="NOT_READY",
        ),
        sa.Column("current_evidence_submission_id", sa.String(64), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_deal_room_milestones_room_id", "deal_room_milestones", ["room_id"]
    )
    op.create_index(
        "ix_deal_room_milestones_source_proposal_id",
        "deal_room_milestones",
        ["source_proposal_id"],
    )
    op.create_index(
        "ix_deal_room_milestones_responsible_user_id",
        "deal_room_milestones",
        ["responsible_user_id"],
    )
    op.create_index(
        "ix_deal_room_milestones_reviewer_user_id",
        "deal_room_milestones",
        ["reviewer_user_id"],
    )
    op.create_index(
        "ix_deal_room_milestones_status", "deal_room_milestones", ["status"]
    )
    op.create_index(
        "ix_deal_room_milestones_payment_readiness",
        "deal_room_milestones",
        ["payment_readiness"],
    )

    # 2. milestone_evidence table
    op.create_table(
        "milestone_evidence",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "milestone_id",
            sa.String(64),
            sa.ForeignKey("deal_room_milestones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "submitted_by_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "submission_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "evidence_type",
            sa.String(50),
            nullable=False,
            server_default="EXTERNAL_REFERENCE",
        ),
        sa.Column("reference_url", sa.String(500), nullable=False),
        sa.Column("attachments", sa.JSON(), nullable=False),
        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default="PENDING_REVIEW",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_milestone_evidence_milestone_id", "milestone_evidence", ["milestone_id"]
    )
    op.create_index("ix_milestone_evidence_room_id", "milestone_evidence", ["room_id"])
    op.create_index(
        "ix_milestone_evidence_submitted_by_id",
        "milestone_evidence",
        ["submitted_by_id"],
    )
    op.create_index("ix_milestone_evidence_status", "milestone_evidence", ["status"])

    # 3. milestone_reviews table
    op.create_table(
        "milestone_reviews",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "milestone_id",
            sa.String(64),
            sa.ForeignKey("deal_room_milestones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "evidence_id",
            sa.String(64),
            sa.ForeignKey("milestone_evidence.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("evidence_version", sa.Integer(), nullable=False),
        sa.Column(
            "reviewer_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("decision", sa.String(30), nullable=False),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_milestone_reviews_milestone_id", "milestone_reviews", ["milestone_id"]
    )
    op.create_index(
        "ix_milestone_reviews_evidence_id", "milestone_reviews", ["evidence_id"]
    )
    op.create_index(
        "ix_milestone_reviews_reviewer_id", "milestone_reviews", ["reviewer_id"]
    )


def downgrade() -> None:
    op.drop_table("milestone_reviews")
    op.drop_table("milestone_evidence")
    op.drop_table("deal_room_milestones")
