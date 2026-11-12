from typing import Annotated

from app.core.auth import get_optional_user_id
from app.core.database import get_db
from app.models.transaction import TransactionStatus
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.payment import LedgerListResponse
from app.schemas.transaction import TransactionRead, TransactionStatusEnum
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ledger", tags=["Commerce Ledger"])


@router.get("", response_model=LedgerListResponse)
@router.get("/", response_model=LedgerListResponse, include_in_schema=False)
def get_ledger_transactions(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
    status: Annotated[
        TransactionStatusEnum | None,
        Query(description="Filter by transaction status"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    biz_repo = BusinessRepository(db)
    tx_repo = TransactionRepository(db)
    status_filter = TransactionStatus(status.value) if status else None

    if user_id:
        business = biz_repo.get_by_user_id(user_id)
        business_id = business.id if business else None
        items = tx_repo.list_for_user(
            user_id=user_id,
            business_id=business_id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
        total_count = tx_repo.count_for_user(
            user_id=user_id,
            business_id=business_id,
            status=status_filter,
        )
    else:
        business = biz_repo.get_or_create_default_business()
        items = tx_repo.list(
            business_id=business.id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
        total_count = tx_repo.count(business_id=business.id, status=status_filter)

    return LedgerListResponse(
        items=[TransactionRead.model_validate(item) for item in items],
        total=total_count,
    )


@router.get(
    "/{transaction_ref}/invoice",
    summary="Get commercial invoice details for transaction",
)
def get_transaction_invoice(
    transaction_ref: str,
    db: Annotated[Session, Depends(get_db)],
):
    from app.models.transaction import Transaction
    from sqlalchemy import or_

    tx = (
        db.query(Transaction)
        .filter(
            or_(
                Transaction.transaction_ref == transaction_ref,
                Transaction.transaction_ref == f"TXN-{transaction_ref}",
                Transaction.transaction_ref == transaction_ref.replace("INV-", "TXN-"),
            )
        )
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Invoice / transaction '{transaction_ref}' not found.",
        )

    inv_num = (
        tx.transaction_ref.replace("TXN-", "INV-")
        if tx.transaction_ref.startswith("TXN-")
        else f"INV-{tx.transaction_ref}"
    )

    return {
        "invoice_number": inv_num,
        "transaction_ref": tx.transaction_ref,
        "amount": str(tx.amount),
        "currency": tx.currency,
        "status": tx.status.value if hasattr(tx.status, "value") else str(tx.status),
        "is_paid": tx.status == TransactionStatus.COMPLETED,
        "payment_method": tx.payment_method,
        "description": tx.description or "Commercial Deliverable",
        "customer_name": tx.customer_name or "Commercial Counterparty",
        "customer_email": tx.customer_email,
        "payer_user_id": tx.payer_user_id,
        "payee_user_id": tx.payee_user_id,
        "deal_room_id": tx.deal_room_id,
        "milestone_id": tx.milestone_id,
        "paypal_order_id": tx.paypal_order_id,
        "paypal_capture_id": tx.paypal_capture_id,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


@router.get(
    "/{transaction_ref}/invoice/download",
    summary="Download standalone official HTML commercial invoice",
)
def download_transaction_invoice_html(
    transaction_ref: str,
    db: Annotated[Session, Depends(get_db)],
):
    from app.models.transaction import Transaction
    from sqlalchemy import or_

    tx = (
        db.query(Transaction)
        .filter(
            or_(
                Transaction.transaction_ref == transaction_ref,
                Transaction.transaction_ref == f"TXN-{transaction_ref}",
                Transaction.transaction_ref == transaction_ref.replace("INV-", "TXN-"),
            )
        )
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Invoice / transaction '{transaction_ref}' not found.",
        )

    inv_num = (
        tx.transaction_ref.replace("TXN-", "INV-")
        if tx.transaction_ref.startswith("TXN-")
        else f"INV-{tx.transaction_ref}"
    )
    is_paid = tx.status == TransactionStatus.COMPLETED
    status_label = "PAID & SETTLED" if is_paid else "PENDING RELEASE"
    status_badge_class = (
        "background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;"
        if is_paid
        else "background:#fffbeb;color:#b45309;border:1px solid #fde68a;"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice {inv_num} - Opnly Opportunity Network</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px 20px; }}
    .card {{ max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 48px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .hdr {{ display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 32px; }}
    .badge {{ display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; {status_badge_class} }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; margin-bottom: 32px; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }}
    th, td {{ padding: 14px 16px; font-size: 13px; }}
    th {{ background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }}
    .audit {{ background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; font-size: 12px; color: #312e81; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <div>
        <h1 style="font-size:24px;font-weight:800;">Opnly Invoice</h1>
        <p style="font-size:12px;color:#64748b;">Official Commercial Settlement Record</p>
      </div>
      <div style="text-align:right;">
        <span class="badge">{status_label}</span>
        <div style="font-family:monospace;font-weight:700;">{inv_num}</div>
      </div>
    </div>
    <div class="grid">
      <div>
        <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Payee</div>
        <div style="font-weight:700;">Opnly Commercial Member</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Billed To</div>
        <div style="font-weight:700;">{tx.customer_name or "Commercial Counterparty"}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Deliverable Scope</th><th style="text-align:right;">Total</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>{tx.description or "Commercial Milestone Deliverable"}</strong></td>
          <td style="text-align:right;font-family:monospace;font-weight:700;">${tx.amount} {tx.currency}</td>
        </tr>
      </tbody>
    </table>
    <div class="audit">
      <strong>Verified Provenance:</strong> Rail: {tx.payment_method} &middot; Ref: {tx.transaction_ref}
    </div>
  </div>
</body>
</html>"""

    from fastapi.responses import Response

    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="Invoice-{inv_num}.html"'
        },
    )
