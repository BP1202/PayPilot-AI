"""Agreement-backed commercial settlement role validation service.

Resolves and strictly validates the commercial settlement parties (payer and payee)
for an approved milestone based exclusively on authoritative accepted Deal Room
agreement terms and active room participants.

Strict compliance rules:
- Fails safely on missing, ambiguous, or conflicting agreement data (HTTP 422).
- Validates active Deal Room caller authorization (HTTP 403).
- Prohibits assumptions from proposal creator/recipient or reviewer/worker alone.
- Never falls back to default users or request-supplied identities.
- Prohibits financial self-settlement (payer == payee).
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
from app.models.milestone_execution import (
    MilestoneExecution,
    MilestoneExecutionStatus,
    PaymentReadinessStatus,
)


class ValidatedSettlementRoles(BaseModel):
    """Authoritative, validated commercial settlement contract for a milestone."""

    model_config = ConfigDict(frozen=True)

    room_id: str
    milestone_id: str
    source_proposal_id: str
    accepted_proposal_version: int
    payer_user_id: str
    payee_user_id: str
    agreed_amount: Decimal
    currency: str
    resolution_source: str


class SettlementRoleValidator:
    """Domain validator for deriving and verifying commercial settlement parties."""

    PAYER_ROLE_KEYS = (
        "payer_user_id",
        "payer_id",
        "payer",
        "funder_user_id",
        "funder_id",
        "funder",
        "client_user_id",
        "client_id",
        "client",
        "buyer_user_id",
        "buyer_id",
        "buyer",
    )

    PAYEE_ROLE_KEYS = (
        "payee_user_id",
        "payee_id",
        "payee",
        "contractor_user_id",
        "contractor_id",
        "contractor",
        "seller_user_id",
        "seller_id",
        "seller",
        "vendor_user_id",
        "vendor_id",
        "vendor",
        "service_provider_id",
        "worker_user_id",
        "worker_id",
        "worker",
    )

    PAYER_KEYWORDS = ("pay", "payer", "pays", "paying", "payment", "fund", "funder", "funding", "client", "buyer")
    PAYEE_KEYWORDS = ("receive", "receives", "payee", "contractor", "deliver", "delivering", "developer", "vendor", "seller")

    def validate_settlement_roles(
        self,
        db: Session,
        *,
        caller_user_id: str,
        room_id: str,
        milestone_id: str,
    ) -> ValidatedSettlementRoles:
        """
        Validate and resolve commercial settlement parties for a milestone.

        Raises:
            HTTPException(403): Caller is not an active participant in the Deal Room.
            HTTPException(404): Deal Room or Milestone does not exist.
            HTTPException(422): Agreement terms are inactive, ambiguous, conflicting,
                                missing, non-monetary, or unapproved.
        """
        # 1. Parent Deal Room must exist and be active
        room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal Room '{room_id}' not found.",
            )

        if room.status != DealRoomStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Deal Room '{room_id}' is not active (current status: '{room.status}'). "
                    "Settlement role validation strictly requires an active Deal Room."
                ),
            )

        # 2. Caller must be an authorized participant of this Deal Room
        room_participants: list[DealRoomParticipant] = (
            db.query(DealRoomParticipant)
            .filter(DealRoomParticipant.room_id == room.id)
            .all()
        )
        participant_ids = {p.user_id for p in room_participants}
        if caller_user_id not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Caller is not an active participant in this Deal Room.",
            )

        # 3. Milestone must exist and belong to the specified Deal Room
        milestone = (
            db.query(MilestoneExecution)
            .filter(
                MilestoneExecution.id == milestone_id,
                MilestoneExecution.room_id == room.id,
            )
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone '{milestone_id}' not found in Deal Room '{room_id}'.",
            )

        # 4. Milestone must be explicitly approved and payment-ready
        if milestone.status != MilestoneExecutionStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Milestone '{milestone_id}' is not approved (current status: '{milestone.status}'). "
                    "Deliverables must be explicitly approved before settlement roles can be validated."
                ),
            )

        if (
            milestone.payment_readiness
            != PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Milestone '{milestone_id}' is not in READY_FOR_PAYMENT_REVIEW status "
                    f"(current readiness: '{milestone.payment_readiness}')."
                ),
            )

        # 5. Financial obligation check: agreed amount must be positive
        if milestone.agreed_amount is None or milestone.agreed_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Milestone '{milestone_id}' has no financial settlement obligation "
                    f"(agreed amount: {milestone.agreed_amount}). Non-monetary milestones "
                    "cannot be validated for payment settlement."
                ),
            )

        # 6. Authoritative agreement snapshot must exist
        if not room.accepted_proposal_version:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Deal Room '{room.id}' lacks an authoritative accepted proposal version snapshot.",
            )

        # 7. Derive commercial settlement parties from authoritative agreement terms
        payer_id, payee_id, source = self._resolve_parties_from_agreement(
            room=room,
            milestone=milestone,
            participant_ids=participant_ids,
            participants=room_participants,
        )

        # 8. Both users must be valid, active participants in the Deal Room
        if payer_id not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Derived payer '{payer_id}' is not an active participant in Deal Room '{room.id}'. "
                    "Commercial settlements cannot be established for non-participants."
                ),
            )

        if payee_id not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Derived payee '{payee_id}' is not an active participant in Deal Room '{room.id}'. "
                    "Commercial settlements cannot be established for non-participants."
                ),
            )

        # 9. Payer and payee must be different users
        if payer_id == payee_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Invalid settlement terms: payer and payee resolve to the same user ('{payer_id}'). "
                    "Self-settlement is not supported."
                ),
            )

        # 10. Resolved identities must agree with milestone's assigned responsibilities
        # In a commercial agreement, the payee must be the worker executing deliverables,
        # and the payer must be the reviewer inspecting and approving deliverables.
        if payee_id != milestone.responsible_user_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Conflicting role assignment: Agreement payee ('{payee_id}') does not match "
                    f"milestone responsible worker ('{milestone.responsible_user_id}')."
                ),
            )

        if payer_id != milestone.reviewer_user_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Conflicting role assignment: Agreement payer ('{payer_id}') does not match "
                    f"milestone reviewer ('{milestone.reviewer_user_id}')."
                ),
            )

        return ValidatedSettlementRoles(
            room_id=room.id,
            milestone_id=milestone.id,
            source_proposal_id=milestone.source_proposal_id,
            accepted_proposal_version=milestone.accepted_proposal_version,
            payer_user_id=payer_id,
            payee_user_id=payee_id,
            agreed_amount=Decimal(str(milestone.agreed_amount)),
            currency=milestone.currency,
            resolution_source=source,
        )

    def _resolve_parties_from_agreement(
        self,
        *,
        room: DealRoom,
        milestone: MilestoneExecution,
        participant_ids: set[str],
        participants: list[DealRoomParticipant],
    ) -> tuple[str, str, str]:
        """
        Derive payer and payee from authoritative agreement data without guessing.

        Resolution hierarchy:
        1. Explicit milestone-level configuration in `room.agreed_milestones`.
        2. Explicit room-level agreement in `room.agreed_responsibilities`.
        3. Explicit contractual role descriptions in `DealRoomParticipant.assigned_responsibilities`.

        Raises HTTP 422 if data is missing, ambiguous, or invalid.
        """
        # --- Level 1: Explicit milestone-level configuration ---
        agreed_milestones = room.agreed_milestones or []
        m_item: dict[str, Any] | None = None
        if isinstance(agreed_milestones, list):
            # Locate by milestone index or id/title
            if 0 <= milestone.milestone_index < len(agreed_milestones):
                candidate = agreed_milestones[milestone.milestone_index]
                if isinstance(candidate, dict):
                    m_item = candidate
            if not m_item:
                for candidate in agreed_milestones:
                    if isinstance(candidate, dict) and (
                        candidate.get("id") == milestone.id
                        or candidate.get("title") == milestone.title
                    ):
                        m_item = candidate
                        break

        if m_item:
            m_payer = self._extract_user_id(m_item, self.PAYER_ROLE_KEYS, participant_ids)
            m_payee = self._extract_user_id(m_item, self.PAYEE_ROLE_KEYS, participant_ids)
            if m_payer and m_payee:
                return m_payer, m_payee, "EXPLICIT_MILESTONE_SNAPSHOT"

        # --- Level 2: Explicit room-level responsibility mapping ---
        resp_map = room.agreed_responsibilities or {}
        if isinstance(resp_map, dict) and resp_map:
            r_payer = self._extract_user_id(resp_map, self.PAYER_ROLE_KEYS, participant_ids)
            r_payee = self._extract_user_id(resp_map, self.PAYEE_ROLE_KEYS, participant_ids)
            if r_payer and r_payee:
                return r_payer, r_payee, "EXPLICIT_AGREED_RESPONSIBILITIES"

        # --- Level 3: Unambiguous contractual participant responsibilities ---
        # Explicit clauses in assigned_responsibilities establishing payment vs delivery duties
        derived_payer: str | None = None
        derived_payee: str | None = None

        for p in participants:
            text = (p.assigned_responsibilities or "").lower()

            # Strictly require explicit contractual payment/funding commitment.
            # Operational or communicative references (e.g., "discusses payment", "reviews payment")
            # do NOT constitute financial authorization.
            is_operational_only = bool(
                re.search(r"\b(reviews|discusses|negotiates|tracks|monitors)\s+(the\s+)?payment", text)
            )
            has_payer_clause = (not is_operational_only) and bool(
                re.search(
                    r"\b(funds\s+milestone|responsible\s+for\s+(funding|paying|payment)|pays\s+(agreed|milestone|for)|funds\s+payment|client\s+funder|contractual\s+payer|funds\s+milestone\s+releases)\b",
                    text,
                )
            )
            has_payee_clause = bool(
                re.search(
                    r"\b(receives\s+payment|payee|contractor\s+deliver|delivering\s+features|service\s+provider|receive\s+payment)\b",
                    text,
                )
            )

            if has_payer_clause and not has_payee_clause:
                if derived_payer and derived_payer != p.user_id:
                    # Ambiguity: multiple payers detected
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            "Ambiguous commercial roles: Multiple participants are assigned payment obligations "
                            "in the accepted agreement snapshot."
                        ),
                    )
                derived_payer = p.user_id
            elif has_payee_clause and not has_payer_clause:
                if derived_payee and derived_payee != p.user_id:
                    # Ambiguity: multiple payees detected
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            "Ambiguous commercial roles: Multiple participants are assigned delivery/payee obligations "
                            "in the accepted agreement snapshot."
                        ),
                    )
                derived_payee = p.user_id

        if derived_payer and derived_payee:
            return derived_payer, derived_payee, "UNAMBIGUOUS_PARTICIPANT_RESPONSIBILITIES"

        # Fallback / assumption prohibition:
        # We NEVER fall back to proposal creator/recipient or reviewer/worker alone without agreement backing.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The accepted Deal Room agreement snapshot does not explicitly establish the commercial payer "
                "and payee roles. Commercial settlement roles cannot be inferred automatically."
            ),
        )

    def _extract_user_id(
        self,
        mapping: dict[str, Any],
        keys: tuple[str, ...],
        participant_ids: set[str],
    ) -> str | None:
        """Extract a valid user ID from mapping keys, verifying participant membership if possible."""
        for k in keys:
            val = mapping.get(k)
            if isinstance(val, str) and val.strip():
                clean_val = val.strip()
                if clean_val in participant_ids:
                    return clean_val
                # If the key is an explicit user identifier (starts with usr_), return it so caller can validate
                if clean_val.startswith("usr_") or len(clean_val) >= 4:
                    return clean_val
        return None
