"""add connections and proposals

Revision ID: 008_add_connections_and_proposals
Revises: 007_add_opportunity_publishing_and_lifecycle
Create Date: 2026-11-05 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_add_connections_and_proposals"
down_revision: str | None = "007_add_opportunity_publishing_and_lifecycle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- connections table ---
    op.create_table(
        "connections",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "requester_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipient_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opportunity_id",
            sa.String(64),
            sa.ForeignKey("opportunities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "business_id",
            sa.Integer,
            sa.ForeignKey("businesses.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column(
            "intent",
            sa.String(50),
            nullable=False,
            server_default="EXPLORE_COLLABORATION",
        ),
        sa.Column("message", sa.String(1000), nullable=False),
        sa.Column("response_note", sa.String(1000), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_connections_requester_id", "connections", ["requester_id"])
    op.create_index("ix_connections_recipient_id", "connections", ["recipient_id"])
    op.create_index("ix_connections_opportunity_id", "connections", ["opportunity_id"])
    op.create_index("ix_connections_status", "connections", ["status"])

    # --- proposals table ---
    op.create_table(
        "proposals",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "connection_id",
            sa.String(64),
            sa.ForeignKey("connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opportunity_id",
            sa.String(64),
            sa.ForeignKey("opportunities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "proposer_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipient_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(30), nullable=False, server_default="SUBMITTED"),
        sa.Column("current_version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("scope_of_work", sa.Text, nullable=True),
        sa.Column("deliverables", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("budget_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("timeline_summary", sa.String(255), nullable=True),
        sa.Column("estimated_duration_days", sa.Integer, nullable=True),
        sa.Column("milestones", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("responsibilities", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("assumptions", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("conditions", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("proposer_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recipient_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_version", sa.Integer, nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("revision_requested_note", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_proposals_connection_id", "proposals", ["connection_id"])
    op.create_index("ix_proposals_opportunity_id", "proposals", ["opportunity_id"])
    op.create_index("ix_proposals_proposer_id", "proposals", ["proposer_id"])
    op.create_index("ix_proposals_recipient_id", "proposals", ["recipient_id"])
    op.create_index("ix_proposals_status", "proposals", ["status"])

    # --- proposal_revisions table ---
    op.create_table(
        "proposal_revisions",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "proposal_id",
            sa.String(64),
            sa.ForeignKey("proposals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column(
            "created_by_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("scope_of_work", sa.Text, nullable=True),
        sa.Column("deliverables", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("budget_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("milestones", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("responsibilities", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("assumptions", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("conditions", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("change_summary", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_proposal_revisions_proposal_id", "proposal_revisions", ["proposal_id"]
    )

    # --- collaboration_activities table ---
    op.create_table(
        "collaboration_activities",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(30), nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=False),
        sa.Column("activity_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_collaboration_activities_user_id",
        "collaboration_activities",
        ["user_id"],
    )
    op.create_index(
        "ix_collaboration_activities_entity_id",
        "collaboration_activities",
        ["entity_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_collaboration_activities_entity_id", table_name="collaboration_activities"
    )
    op.drop_index(
        "ix_collaboration_activities_user_id", table_name="collaboration_activities"
    )
    op.drop_table("collaboration_activities")

    op.drop_index("ix_proposal_revisions_proposal_id", table_name="proposal_revisions")
    op.drop_table("proposal_revisions")

    op.drop_index("ix_proposals_status", table_name="proposals")
    op.drop_index("ix_proposals_recipient_id", table_name="proposals")
    op.drop_index("ix_proposals_proposer_id", table_name="proposals")
    op.drop_index("ix_proposals_opportunity_id", table_name="proposals")
    op.drop_index("ix_proposals_connection_id", table_name="proposals")
    op.drop_table("proposals")

    op.drop_index("ix_connections_status", table_name="connections")
    op.drop_index("ix_connections_opportunity_id", table_name="connections")
    op.drop_index("ix_connections_recipient_id", table_name="connections")
    op.drop_index("ix_connections_requester_id", table_name="connections")
    op.drop_table("connections")
