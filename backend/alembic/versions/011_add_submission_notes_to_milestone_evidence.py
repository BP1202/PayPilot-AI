"""add submission notes to milestone evidence

Revision ID: 011_add_submission_notes_to_milestone_evidence
Revises: 010_add_milestone_execution
Create Date: 2026-11-08 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011_add_submission_notes_to_milestone_evidence"
down_revision: str | None = "010_add_milestone_execution"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "milestone_evidence",
        sa.Column("submission_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("milestone_evidence", "submission_notes")

