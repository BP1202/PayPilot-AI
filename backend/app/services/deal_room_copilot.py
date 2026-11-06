import json
import logging
from typing import Any

import httpx

from app.models.deal_room import DealRoom
from app.schemas.deal_room import DealRoomAIAnalysisResponse

logger = logging.getLogger(__name__)

GEMINI_DEAL_ROOM_SYSTEM_PROMPT = """You are the Opnly AI Deal Room Copilot.
Your job is to assist authorized collaboration participants in understanding their agreed project terms, responsibilities, schedule risks, and immediate next actions.

STRICT CONSTRAINTS:
1. Zero-Invention Rule: Base all analysis strictly on the provided Agreed Terms, Notes, and Clarifications. Never invent budget numbers, milestones, deadlines, or claims of contract execution.
2. Grounded Provenance: Every key finding and recommendation must be classified into exactly one of these provenance categories:
   - "AGREED_TERM": Sourced directly from the accepted proposal terms (scope, milestones, budget).
   - "USER_RECORDED_FACT": Sourced from shared notes or resolved clarifications.
   - "VERIFIED_RECORD": Sourced from authenticated system records (timestamps, participants).
   - "AI_SUGGESTION": Advisory recommendation for the team to consider.
   - "AI_HYPOTHESIS": Analytical inference or potential risk scenario.
   - "UNKNOWN_OR_MISSING": Missing information or ambiguous details identified in the collaboration data.
3. Advisory Only: The AI assists but never signs contracts, never releases payments, and never modifies agreed terms.

Output MUST be a valid JSON object matching this schema:
{
  "summary": "2-3 sentence overview of the analysis",
  "key_findings": ["Finding 1", "Finding 2"],
  "actionable_recommendations": ["Recommendation 1", "Recommendation 2"],
  "provenance_breakdown": {
    "AGREED_TERM": ["item 1", "item 2"],
    "USER_RECORDED_FACT": ["item 1"],
    "VERIFIED_RECORD": ["item 1"],
    "AI_SUGGESTION": ["item 1"],
    "AI_HYPOTHESIS": ["item 1"],
    "UNKNOWN_OR_MISSING": ["item 1"]
  }
}
"""


class DeterministicDealRoomCopilot:
    """Offline, deterministic analysis engine for Deal Room agreements."""

    @staticmethod
    def analyze(
        room: DealRoom,
        analysis_type: str,
    ) -> DealRoomAIAnalysisResponse:
        deliverables = room.agreed_deliverables or []
        milestones = room.agreed_milestones or []
        responsibilities = room.agreed_responsibilities or {}
        budget_str = (
            f"${room.agreed_budget_amount:,.2f} {room.agreed_currency}"
            if room.agreed_budget_amount
            else "Not specified"
        )

        agreed_terms_list = []
        user_facts_list = []
        verified_records_list = [
            f"Deal Room {room.id} is currently in {room.status} status",
            f"Created from accepted proposal version {room.accepted_proposal_version}",
        ]
        ai_suggestions = []
        ai_hypotheses = []
        unknown_or_missing = []

        if room.agreed_scope_of_work:
            agreed_terms_list.append(
                f"Agreed scope: {room.agreed_scope_of_work[:120]}..."
            )
        if deliverables:
            agreed_terms_list.append(
                f"{len(deliverables)} explicit deliverable(s) defined"
            )
        if room.agreed_budget_amount:
            agreed_terms_list.append(f"Agreed budget of {budget_str}")
        if milestones:
            agreed_terms_list.append(f"{len(milestones)} structured milestone stage(s)")

        # Collect user-recorded facts from notes & clarifications
        notes = getattr(room, "notes", []) or []
        for n in notes[:3]:
            user_facts_list.append(f"Shared note: '{n.title}'")

        clarifications = getattr(room, "clarifications", []) or []
        open_clars = [c for c in clarifications if c.status == "OPEN"]
        if open_clars:
            unknown_or_missing.append(
                f"{len(open_clars)} unanswered clarification question(s) pending"
            )

        if analysis_type == "SUMMARY":
            summary = (
                f"Collaboration '{room.title}' contains {len(deliverables)} agreed deliverable(s) "
                f"and {len(milestones)} milestone(s) with an agreed budget of {budget_str}."
            )
            key_findings = [
                f"Project status is {room.status} with {len(room.participants)} participant(s).",
                f"Total agreed budget: {budget_str}.",
                f"Timeline: {room.agreed_timeline_summary or f'{room.agreed_estimated_duration_days} days' if room.agreed_estimated_duration_days else 'Flexible'}.",
            ]
            actionable_recs = [
                "Review the initial milestone deliverables with the counterpart.",
                "Ensure both participants have reviewed shared reference documents.",
            ]
            ai_suggestions.extend(actionable_recs)

        elif analysis_type == "RESPONSIBILITIES":
            summary = f"Responsibility allocation for '{room.title}' based on proposal version {room.accepted_proposal_version}."
            key_findings = []
            if responsibilities:
                for role, duty in list(responsibilities.items())[:4]:
                    agreed_terms_list.append(f"{role}: {duty}")
                    key_findings.append(f"Role '{role}' is assigned: {duty}")
            else:
                unknown_or_missing.append(
                    "Detailed individual responsibility breakdown not formally specified in proposal"
                )
                key_findings.append(
                    "No granular role assignments specified in the proposal terms."
                )

            actionable_recs = [
                "Clarify specific technical ownership for each agreed deliverable.",
                "Add a shared note to document lead vs review duties.",
            ]
            ai_suggestions.extend(actionable_recs)

        elif analysis_type == "RISKS":
            summary = f"Risk and dependency analysis for '{room.title}'."
            key_findings = []
            if not milestones:
                ai_hypotheses.append(
                    "Absence of intermediate milestones may increase delivery uncertainty"
                )
                key_findings.append(
                    "No phased milestones defined for progressive validation."
                )
            if (
                not room.agreed_estimated_duration_days
                and not room.agreed_timeline_summary
            ):
                unknown_or_missing.append(
                    "Target completion date or duration is unstated"
                )
                key_findings.append("No explicit completion timeline established.")
            if room.agreed_assumptions:
                for assump in room.agreed_assumptions[:3]:
                    agreed_terms_list.append(f"Agreed assumption: {assump}")
                    ai_hypotheses.append(f"Dependency on assumption: '{assump}'")
                key_findings.append(
                    f"{len(room.agreed_assumptions)} documented project assumption(s)."
                )

            if not key_findings:
                key_findings.append(
                    "No high-severity schedule or dependency risks identified."
                )

            actionable_recs = [
                "Establish intermediate check-in dates for milestone deliverables.",
                "Confirm that external prerequisites and API access are available.",
            ]
            ai_suggestions.extend(actionable_recs)

        else:  # NEXT_ACTIONS
            summary = f"Recommended operational next actions for '{room.title}'."
            key_findings = [
                f"Current room status is {room.status}.",
                f"First milestone: {milestones[0].get('title', 'Initial Delivery') if milestones else 'Scope definition'}.",
            ]
            actionable_recs = [
                "Initiate kickoff discussion using Shared Notes.",
                "Upload or link relevant specification documents in Documents & References.",
                "Verify acceptance criteria for Milestone 1.",
            ]
            ai_suggestions.extend(actionable_recs)

        provenance_breakdown = {
            "AGREED_TERM": agreed_terms_list,
            "USER_RECORDED_FACT": user_facts_list,
            "VERIFIED_RECORD": verified_records_list,
            "AI_SUGGESTION": ai_suggestions,
            "AI_HYPOTHESIS": ai_hypotheses,
            "UNKNOWN_OR_MISSING": unknown_or_missing,
        }

        return DealRoomAIAnalysisResponse(
            analysis_type=analysis_type,
            summary=summary,
            key_findings=key_findings,
            actionable_recommendations=actionable_recs,
            provenance_breakdown=provenance_breakdown,
            mode="DETERMINISTIC_FALLBACK",
            provider="deterministic-engine",
            model="deterministic-rule-engine",
        )


class GeminiDealRoomCopilot:
    """Enriches Deal Room understanding using Google Gemini with strict provenance."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout_seconds: float = 10.0,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout_seconds

    async def analyze(
        self,
        room: DealRoom,
        analysis_type: str,
    ) -> DealRoomAIAnalysisResponse:
        fallback = DeterministicDealRoomCopilot.analyze(room, analysis_type)

        if (
            not self.api_key
            or self.api_key.startswith("your-")
            or "test" in self.api_key.lower()
        ):
            logger.info(
                "Gemini API key not configured or simulated; using deterministic Deal Room Copilot."
            )
            return fallback

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        budget_str = (
            f"${room.agreed_budget_amount:,.2f} {room.agreed_currency}"
            if room.agreed_budget_amount
            else "Not specified"
        )
        milestones_json = json.dumps(room.agreed_milestones or [], default=str)
        responsibilities_json = json.dumps(
            room.agreed_responsibilities or {}, default=str
        )

        user_content = (
            f"REQUESTED ANALYSIS: {analysis_type}\n\n"
            f"AGREED TERMS (IMMUTABLE):\n"
            f"- Title: {room.title}\n"
            f"- Description: {room.description}\n"
            f"- Status: {room.status}\n"
            f"- Accepted Version: {room.accepted_proposal_version}\n"
            f"- Scope of Work: {room.agreed_scope_of_work or 'Not specified'}\n"
            f"- Deliverables: {', '.join(room.agreed_deliverables or []) or 'None explicitly listed'}\n"
            f"- Budget: {budget_str}\n"
            f"- Timeline: {room.agreed_timeline_summary or 'Not specified'}\n"
            f"- Milestones: {milestones_json}\n"
            f"- Responsibilities: {responsibilities_json}\n"
            f"- Assumptions: {', '.join(room.agreed_assumptions or []) or 'None listed'}\n"
            f"- Conditions: {', '.join(room.agreed_conditions or []) or 'None listed'}\n\n"
            f"Provide an articulate, grounded analysis strictly complying with the system prompt schema."
        )

        payload: dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_content}],
                }
            ],
            "systemInstruction": {"parts": [{"text": GEMINI_DEAL_ROOM_SYSTEM_PROMPT}]},
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code != 200:
                    logger.warning(
                        "Gemini Deal Room API returned %d: %s. Using fallback.",
                        resp.status_code,
                        resp.text[:200],
                    )
                    return fallback

                data = resp.json()
                raw_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                if not raw_text:
                    logger.warning("Empty response from Gemini. Using fallback.")
                    return fallback

                parsed = json.loads(raw_text)
                return DealRoomAIAnalysisResponse(
                    analysis_type=analysis_type,
                    summary=parsed.get("summary") or fallback.summary,
                    key_findings=parsed.get("key_findings") or fallback.key_findings,
                    actionable_recommendations=parsed.get("actionable_recommendations")
                    or fallback.actionable_recommendations,
                    provenance_breakdown=parsed.get("provenance_breakdown")
                    or fallback.provenance_breakdown,
                    mode="LIVE_AI",
                    provider="google-gemini",
                    model=self.model,
                )
        except (
            httpx.HTTPError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            ValueError,
        ) as err:
            logger.warning(
                "Error calling Gemini Deal Room API (%s). Falling back.", err
            )
            return fallback
