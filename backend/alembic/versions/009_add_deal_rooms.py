"""add deal rooms and collaboration workspaces

Revision ID: 009_add_deal_rooms
Revises: 008_add_connections_and_proposals
Create Date: 2026-11-06 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009_add_deal_rooms"
down_revision: str | None = "008_add_connections_and_proposals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. deal_rooms table
    op.create_table(
        "deal_rooms",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "proposal_id",
            sa.String(64),
            sa.ForeignKey("proposals.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
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
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="ACTIVE"),
        sa.Column("status_reason", sa.Text(), nullable=True),
        sa.Column("accepted_proposal_version", sa.Integer(), nullable=False),
        # Immutable agreed terms snapshot
        sa.Column("agreed_scope_of_work", sa.Text(), nullable=True),
        sa.Column("agreed_deliverables", sa.JSON(), nullable=False),
        sa.Column("agreed_budget_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("agreed_currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("agreed_timeline_summary", sa.String(255), nullable=True),
        sa.Column("agreed_estimated_duration_days", sa.Integer(), nullable=True),
        sa.Column("agreed_milestones", sa.JSON(), nullable=False),
        sa.Column("agreed_responsibilities", sa.JSON(), nullable=False),
        sa.Column("agreed_assumptions", sa.JSON(), nullable=False),
        sa.Column("agreed_conditions", sa.JSON(), nullable=False),
        sa.Column("agreed_notes", sa.Text(), nullable=True),
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
    op.create_index(op.f("ix_deal_rooms_proposal_id"), "deal_rooms", ["proposal_id"], unique=True)
    op.create_index(op.f("ix_deal_rooms_connection_id"), "deal_rooms", ["connection_id"], unique=False)
    op.create_index(op.f("ix_deal_rooms_opportunity_id"), "deal_rooms", ["opportunity_id"], unique=False)
    op.create_index(op.f("ix_deal_rooms_status"), "deal_rooms", ["status"], unique=False)

    # 2. deal_room_participants table
    op.create_table(
        "deal_room_participants",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "collaboration_role",
            sa.String(100),
            nullable=False,
            server_default="Collaborator",
        ),
        sa.Column("assigned_responsibilities", sa.Text(), nullable=True),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_deal_room_participants_room_id"), "deal_room_participants", ["room_id"], unique=False)
    op.create_index(op.f("ix_deal_room_participants_user_id"), "deal_room_participants", ["user_id"], unique=False)

    # 3. deal_room_activities table
    op.create_table(
        "deal_room_activities",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("activity_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_deal_room_activities_room_id"), "deal_room_activities", ["room_id"], unique=False)
    op.create_index(op.f("ix_deal_room_activities_actor_id"), "deal_room_activities", ["actor_id"], unique=False)
    op.create_index(op.f("ix_deal_room_activities_activity_type"), "deal_room_activities", ["activity_type"], unique=False)
    op.create_index(op.f("ix_deal_room_activities_created_at"), "deal_room_activities", ["created_at"], unique=False)

    # 4. deal_room_documents table
    op.create_table(
        "deal_room_documents",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column(
            "document_type",
            sa.String(50),
            nullable=False,
            server_default="REFERENCE_LINK",
        ),
        sa.Column("reference_url", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_deal_room_documents_room_id"), "deal_room_documents", ["room_id"], unique=False)
    op.create_index(op.f("ix_deal_room_documents_uploaded_by_id"), "deal_room_documents", ["uploaded_by_id"], unique=False)

    # 5. deal_room_notes table
    op.create_table(
        "deal_room_notes",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
    op.create_index(op.f("ix_deal_room_notes_room_id"), "deal_room_notes", ["room_id"], unique=False)
    op.create_index(op.f("ix_deal_room_notes_author_id"), "deal_room_notes", ["author_id"], unique=False)

    # 6. deal_room_clarifications table
    op.create_table(
        "deal_room_clarifications",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column(
            "room_id",
            sa.String(64),
            sa.ForeignKey("deal_rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "asked_by_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column(
            "answered_by_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_deal_room_clarifications_room_id"), "deal_room_clarifications", ["room_id"], unique=False)
    op.create_index(op.f("ix_deal_room_clarifications_asked_by_id"), "deal_room_clarifications", ["asked_by_id"], unique=False)
    op.create_index(op.f("ix_deal_room_clarifications_status"), "deal_room_clarifications", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("deal_room_clarifications")
    op.drop_table("deal_room_notes")
    op.drop_table("deal_room_documents")
    op.drop_table("deal_room_activities")
    op.drop_table("deal_room_participants")
    op.drop_table("deal_rooms")

