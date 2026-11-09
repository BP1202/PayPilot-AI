"""add settlement fields to transactions table

Revision ID: 013_add_settlement_fields_to_transactions
Revises: 012_add_unique_constraint_to_milestone_evidence
Create Date: 2026-11-08 17:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "013_add_settlement_fields_to_transactions"
down_revision: str | None = "012_add_unique_constraint_to_milestone_evidence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    # Check for pre-existing duplicate external references or idempotency values before applying unique constraints
    inspector = sa.inspect(bind)
    table_cols = [c["name"] for c in inspector.get_columns("transactions")]
    if "paypal_order_id" in table_cols:
        dups = bind.execute(
            sa.text(
                "SELECT paypal_order_id, COUNT(*) FROM transactions "
                "WHERE paypal_order_id IS NOT NULL GROUP BY paypal_order_id HAVING COUNT(*) > 1"
            )
        ).fetchall()
        if dups:
            raise RuntimeError(
                f"Cannot apply unique constraint: duplicate paypal_order_id found: {dups}"
            )
    if "paypal_capture_id" in table_cols:
        dups = bind.execute(
            sa.text(
                "SELECT paypal_capture_id, COUNT(*) FROM transactions "
                "WHERE paypal_capture_id IS NOT NULL GROUP BY paypal_capture_id HAVING COUNT(*) > 1"
            )
        ).fetchall()
        if dups:
            raise RuntimeError(
                f"Cannot apply unique constraint: duplicate paypal_capture_id found: {dups}"
            )
    if "milestone_id" in table_cols and "idempotency_key" in table_cols:
        dups = bind.execute(
            sa.text(
                "SELECT milestone_id, idempotency_key, COUNT(*) FROM transactions "
                "WHERE milestone_id IS NOT NULL AND idempotency_key IS NOT NULL "
                "GROUP BY milestone_id, idempotency_key HAVING COUNT(*) > 1"
            )
        ).fetchall()
        if dups:
            raise RuntimeError(
                f"Cannot apply unique constraint: duplicate (milestone_id, idempotency_key) found: {dups}"
            )

    with op.batch_alter_table("transactions") as batch_op:
        batch_op.add_column(
            sa.Column(
                "milestone_id",
                sa.String(length=64),
                sa.ForeignKey("deal_room_milestones.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "deal_room_id",
                sa.String(length=64),
                sa.ForeignKey("deal_rooms.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "payer_user_id",
                sa.String(length=64),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "payee_user_id",
                sa.String(length=64),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column("paypal_order_id", sa.String(length=128), nullable=True)
        )
        batch_op.add_column(
            sa.Column("paypal_capture_id", sa.String(length=128), nullable=True)
        )
        batch_op.add_column(
            sa.Column("idempotency_key", sa.String(length=128), nullable=True)
        )

        batch_op.create_index(
            op.f("ix_transactions_milestone_id"),
            ["milestone_id"],
            unique=False,
        )
        batch_op.create_index(
            op.f("ix_transactions_deal_room_id"),
            ["deal_room_id"],
            unique=False,
        )
        batch_op.create_index(
            op.f("ix_transactions_payer_user_id"),
            ["payer_user_id"],
            unique=False,
        )
        batch_op.create_index(
            op.f("ix_transactions_payee_user_id"),
            ["payee_user_id"],
            unique=False,
        )
        batch_op.create_index(
            op.f("ix_transactions_paypal_order_id"),
            ["paypal_order_id"],
            unique=True,
        )
        batch_op.create_index(
            op.f("ix_transactions_paypal_capture_id"),
            ["paypal_capture_id"],
            unique=True,
        )
        batch_op.create_index(
            op.f("ix_transactions_idempotency_key"),
            ["idempotency_key"],
            unique=False,
        )
        batch_op.create_unique_constraint(
            "uq_transaction_milestone_idempotency",
            ["milestone_id", "idempotency_key"],
        )


def downgrade() -> None:
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.drop_constraint(
            "uq_transaction_milestone_idempotency",
            type_="unique",
        )
        batch_op.drop_index(op.f("ix_transactions_idempotency_key"))
        batch_op.drop_index(op.f("ix_transactions_paypal_capture_id"))
        batch_op.drop_index(op.f("ix_transactions_paypal_order_id"))
        batch_op.drop_index(op.f("ix_transactions_payee_user_id"))
        batch_op.drop_index(op.f("ix_transactions_payer_user_id"))
        batch_op.drop_index(op.f("ix_transactions_deal_room_id"))
        batch_op.drop_index(op.f("ix_transactions_milestone_id"))

        batch_op.drop_column("idempotency_key")
        batch_op.drop_column("paypal_capture_id")
        batch_op.drop_column("paypal_order_id")
        batch_op.drop_column("payee_user_id")
        batch_op.drop_column("payer_user_id")
        batch_op.drop_column("deal_room_id")
        batch_op.drop_column("milestone_id")

