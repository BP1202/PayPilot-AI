"""make transactions business_id nullable for individual settlements

Revision ID: 014_make_transactions_business_id_nullable
Revises: 013_add_settlement_fields_to_transactions
Create Date: 2026-11-09 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "014_make_transactions_business_id_nullable"
down_revision: str | None = "013_add_settlement_fields_to_transactions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.alter_column(
            "business_id",
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    # Set default 1 or ensure no nulls before setting nullable=False if needed
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE transactions SET business_id = 1 WHERE business_id IS NULL")
    )
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.alter_column(
            "business_id",
            existing_type=sa.Integer(),
            nullable=False,
        )

