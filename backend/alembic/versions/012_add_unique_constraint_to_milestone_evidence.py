"""add unique constraint to milestone evidence on milestone_id and submission_version

Revision ID: 012_add_unique_constraint_to_milestone_evidence
Revises: 011_add_submission_notes_to_milestone_evidence
Create Date: 2026-11-08 15:35:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "012_add_unique_constraint_to_milestone_evidence"
down_revision: str | None = "011_add_submission_notes_to_milestone_evidence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("milestone_evidence") as batch_op:
        batch_op.create_unique_constraint(
            "uq_milestone_evidence_version",
            ["milestone_id", "submission_version"],
        )


def downgrade() -> None:
    with op.batch_alter_table("milestone_evidence") as batch_op:
        batch_op.drop_constraint("uq_milestone_evidence_version", type_="unique")

