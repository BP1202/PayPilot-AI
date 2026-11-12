import json
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.business import Business
from app.models.opportunity import (
    Opportunity,
    OpportunityIntent,
    OpportunityStatus,
    OpportunityVisibility,
)
from app.models.profile import IndividualProfile, ProfileVisibility
from app.models.user import User
from app.schemas.matching import (
    MatchExplanation,
    MatchTier,
    OpportunityCandidate,
    OpportunityMatchesResponse,
    ParticipantCandidate,
    ParticipantMatchesResponse,
)

logger = logging.getLogger(__name__)

GEMINI_MATCHMAKING_PROMPT = """You are the Opnly AI Matchmaking Intelligence Agent.
Your responsibility is to explain and synthesize the alignment between an opportunity and a participant (or between two complementary opportunities).

CRITICAL CONSTRAINTS:
1. Zero-Invention Rule: Rely strictly on provided capabilities, skills, services, resources, and industry data. Never fabricate credentials, past client work, revenue, or unverified claims.
2. Grounded Evidence: You must justify why this match is relevant using the candidate's actual skills, services, resources, and experience against the opportunity's explicit requirements.
3. Be concise and professional: Keep explanation_summary to 2-3 clear sentences.

Return a valid, strict JSON object with these exact keys:
{
  "explanation_summary": "Concise natural language synthesis explaining why this candidate and opportunity fit together.",
  "strong_signals": ["Signal 1 directly grounded in data", "Signal 2"],
  "partial_signals": ["Adjacent skill, secondary capability, or available tooling"],
  "missing_information": ["Information not provided in profile/opportunity"],
  "potential_gaps": ["Uncovered requirement or potential mismatch"]
}
"""


def _normalize_tokens(items: list[str]) -> set[str]:
    """Normalize phrases and skills into lowercase tokens for robust matching."""
    tokens = set()
    for item in items:
        if not item:
            continue
        # Split on commas, slashes, or whitespace if multiple
        parts = re.split(r"[,/|;]+", item.lower())
        for part in parts:
            clean = part.strip()
            if clean:
                tokens.add(clean)
                # Also add alphanumeric-only version (e.g. "react.js" -> "react")
                sub = re.sub(r"[^a-z0-9]", "", clean)
                if sub and sub != clean:
                    tokens.add(sub)
    return tokens


def _find_overlapping_items(
    source_items: list[str], target_items: list[str]
) -> list[str]:
    """Find source items that have token overlap with target items."""
    matched = []
    target_tokens = _normalize_tokens(target_items)
    for s in source_items:
        if not s:
            continue
        s_clean = s.strip().lower()
        s_tokens = _normalize_tokens([s])
        if s_tokens & target_tokens:
            matched.append(s)
            continue
        # Sub-phrase word boundary match for multi-word capabilities & experience descriptions
        for t in target_tokens:
            if len(t) >= 4:
                pattern = rf"(?:\b|_){re.escape(t)}(?:\b|_)"
                if re.search(pattern, s_clean) or (
                    len(s_clean) >= 4
                    and re.search(rf"(?:\b|_){re.escape(s_clean)}(?:\b|_)", t)
                ):
                    matched.append(s)
                    break
    return matched


class DeterministicMatchmakingEngine:
    """Offline, deterministic heuristic scoring engine based on token intersections and intent polarity."""

    @staticmethod
    def score_participant_against_opportunity(
        participant_skills: list[str],
        participant_services: list[str],
        participant_industry: str | None,
        required_skills: list[str],
        opportunity_industry: str | None,
        participant_resources: list[str] | None = None,
        participant_experience: list[str] | None = None,
        participant_interests: list[str] | None = None,
    ) -> MatchExplanation:
        skills = participant_skills or []
        services = participant_services or []
        resources = participant_resources or []
        experience = participant_experience or []
        interests = participant_interests or []

        # Find matching items per capability dimension
        matched_skills = _find_overlapping_items(skills, required_skills)
        matched_services = _find_overlapping_items(services, required_skills)
        matched_resources = _find_overlapping_items(resources, required_skills)
        matched_experience = _find_overlapping_items(experience, required_skills)

        # Requirements satisfied across all capability dimensions
        all_candidate_items = skills + services + resources + experience
        covered_reqs = _find_overlapping_items(required_skills, all_candidate_items)
        missing_reqs = [s for s in required_skills if s not in covered_reqs]

        # Industry match
        industry_matched = False
        if participant_industry and opportunity_industry:
            p_ind = participant_industry.strip().lower()
            o_ind = opportunity_industry.strip().lower()
            industry_matched = (p_ind in o_ind) or (o_ind in p_ind)

        # Aligned interests with opportunity requirements or sector
        aligned_interests = []
        if interests:
            interest_targets = list(required_skills)
            if opportunity_industry:
                interest_targets.append(opportunity_industry)
            aligned_interests = _find_overlapping_items(interests, interest_targets)

        # Calculate evidence-grounded score
        if required_skills:
            coverage_ratio = len(covered_reqs) / len(required_skills)
            industry_bonus = 0.15 if industry_matched else 0.0
            service_bonus = 0.05 if matched_services else 0.0
            resource_bonus = 0.05 if matched_resources else 0.0
            experience_bonus = 0.05 if matched_experience else 0.0
            score = min(
                1.0,
                round(
                    (coverage_ratio * 0.70)
                    + industry_bonus
                    + service_bonus
                    + resource_bonus
                    + experience_bonus,
                    2,
                ),
            )
        else:
            score = 0.5 if industry_matched else 0.2

        # Determine Tier
        if score >= 0.6 or (len(covered_reqs) >= 2 and score >= 0.5):
            tier = MatchTier.STRONG_MATCH
        elif score >= 0.35 or len(covered_reqs) >= 1 or industry_matched:
            tier = MatchTier.MODERATE_MATCH
        else:
            tier = MatchTier.EXPLORATORY

        # Build grounded signals
        strong_signals: list[str] = []
        for s in matched_skills:
            strong_signals.append(f"Proficient in {s}")
        for srv in matched_services:
            strong_signals.append(f"Service offering: {srv}")
        for res in matched_resources:
            strong_signals.append(f"Equipped with: {res}")
        for exp in matched_experience:
            strong_signals.append(f"Domain experience: {exp}")
        if industry_matched and opportunity_industry:
            strong_signals.append(f"Domain alignment in {opportunity_industry}")
        # Deduplicate signals while preserving order
        strong_signals = list(dict.fromkeys(strong_signals))

        partial_signals: list[str] = []
        unmatched_skills = [s for s in skills if s not in matched_skills][:2]
        unmatched_services = [s for s in services if s not in matched_services][:2]
        extra_caps = unmatched_skills + unmatched_services
        if extra_caps:
            partial_signals.append(f"Additional capabilities: {', '.join(extra_caps)}")

        unmatched_resources = [r for r in resources if r not in matched_resources][:2]
        if unmatched_resources:
            partial_signals.append(
                f"Available tooling: {', '.join(unmatched_resources)}"
            )

        if aligned_interests:
            partial_signals.append(
                f"Aligned interests: {', '.join(aligned_interests[:2])}"
            )

        potential_gaps = [f"Unmatched requirement: {m}" for m in missing_reqs[:4]]

        missing_info: list[str] = []
        if not (skills or services or resources or experience):
            missing_info.append(
                "Candidate has not specified detailed skills, services, or resources"
            )
        if not required_skills:
            missing_info.append(
                "Opportunity does not specify exact technical prerequisites"
            )

        # Fact-grounded natural language summary
        matched_summaries: list[str] = []
        if matched_skills:
            matched_summaries.append(f"skills in {', '.join(matched_skills[:2])}")
        if matched_services:
            matched_summaries.append(f"services for {', '.join(matched_services[:2])}")
        if matched_resources:
            matched_summaries.append(f"tooling ({', '.join(matched_resources[:2])})")
        if matched_experience:
            matched_summaries.append(
                f"experience in {', '.join(matched_experience[:2])}"
            )

        if matched_summaries:
            summary = (
                f"Candidate matches required capabilities including {' and '.join(matched_summaries)}"
                f"{f' with domain alignment in {opportunity_industry}' if industry_matched else ''}."
            )
        elif industry_matched:
            summary = f"Candidate operates in the {opportunity_industry} sector with relevant background."
        else:
            summary = "Candidate profile has exploratory alignment with potential cross-functional synergy."

        return MatchExplanation(
            match_tier=tier,
            score=score,
            strong_signals=strong_signals,
            partial_signals=partial_signals,
            missing_information=missing_info,
            potential_gaps=potential_gaps,
            explanation_summary=summary,
            mode="DETERMINISTIC_FALLBACK",
            provenance="DETERMINISTIC_CALCULATION",
        )

    @staticmethod
    def score_opportunities_complementary(
        opp_a: Opportunity,
        opp_b: Opportunity,
    ) -> MatchExplanation:
        """Score alignment between two complementary opportunities (e.g. SEEKING vs OFFERING)."""
        skills_a = opp_a.required_skills_and_resources or []
        skills_b = opp_b.required_skills_and_resources or []

        matched_skills = _find_overlapping_items(skills_a, skills_b)

        industry_matched = False
        if opp_a.industry and opp_b.industry:
            industry_matched = (
                opp_a.industry.strip().lower() in opp_b.industry.strip().lower()
            ) or (opp_b.industry.strip().lower() in opp_a.industry.strip().lower())

        category_matched = opp_a.category == opp_b.category

        # Intent complementarity bonus
        intent_complementary = (
            opp_a.intent == OpportunityIntent.SEEKING_SOLUTION.value
            and opp_b.intent == OpportunityIntent.OFFERING_SOLUTION.value
        ) or (
            opp_a.intent == OpportunityIntent.OFFERING_SOLUTION.value
            and opp_b.intent == OpportunityIntent.SEEKING_SOLUTION.value
        )

        base_score = 0.3 if intent_complementary else 0.1
        if matched_skills:
            base_score += 0.4
        if industry_matched:
            base_score += 0.2
        if category_matched:
            base_score += 0.1

        score = min(1.0, round(base_score, 2))

        if score >= 0.65:
            tier = MatchTier.STRONG_MATCH
        elif score >= 0.4:
            tier = MatchTier.MODERATE_MATCH
        else:
            tier = MatchTier.EXPLORATORY

        strong_signals = []
        if intent_complementary:
            strong_signals.append(
                f"Complementary intent: {opp_a.intent} paired with {opp_b.intent}"
            )
        if industry_matched and opp_b.industry:
            strong_signals.append(f"Matching sector: {opp_b.industry}")
        if matched_skills:
            strong_signals.append(
                f"Shared domain capabilities: {', '.join(matched_skills[:3])}"
            )

        summary = (
            f"Complementary match between '{opp_a.title}' and '{opp_b.title}' "
            f"across {opp_b.industry or 'shared market'} requirements."
        )

        return MatchExplanation(
            match_tier=tier,
            score=score,
            strong_signals=strong_signals,
            partial_signals=[],
            missing_information=[],
            potential_gaps=[],
            explanation_summary=summary,
            mode="DETERMINISTIC_FALLBACK",
            provenance="DETERMINISTIC_CALCULATION",
        )


class GeminiMatchmakingProvider:
    """Enriches matchmaking rationale using Google Gemini (gemini-1.5-flash)."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout_seconds: float = 10.0,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout_seconds

    async def enrich_explanation(
        self,
        opportunity_title: str,
        opportunity_industry: str | None,
        required_skills: list[str],
        candidate_name: str,
        candidate_skills: list[str],
        candidate_services: list[str],
        candidate_industry: str | None,
        fallback_explanation: MatchExplanation,
        candidate_resources: list[str] | None = None,
        candidate_experience: list[str] | None = None,
    ) -> MatchExplanation:
        """Call Gemini to provide an enriched, articulate synthesis while keeping factual groundings."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        prompt_input = (
            f"Opportunity: {opportunity_title}\n"
            f"Industry: {opportunity_industry or 'Not specified'}\n"
            f"Required Skills: {', '.join(required_skills) if required_skills else 'None specified'}\n\n"
            f"Candidate: {candidate_name}\n"
            f"Candidate Industry: {candidate_industry or 'Not specified'}\n"
            f"Candidate Skills: {', '.join(candidate_skills) if candidate_skills else 'None listed'}\n"
            f"Candidate Services: {', '.join(candidate_services) if candidate_services else 'None listed'}\n"
            f"Candidate Resources & Tools: {', '.join(candidate_resources) if candidate_resources else 'None listed'}\n"
            f"Candidate Experience: {', '.join(candidate_experience) if candidate_experience else 'None listed'}\n\n"
            f"Deterministic Match Tier: {fallback_explanation.match_tier.value}\n"
            f"Provide an articulate, grounded synthesis following the system prompt instructions."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": GEMINI_MATCHMAKING_PROMPT},
                        {"text": prompt_input},
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        content_parts = candidates[0]["content"]["parts"]
        parsed = json.loads(content_parts[0]["text"])

        return MatchExplanation(
            match_tier=fallback_explanation.match_tier,
            score=fallback_explanation.score,
            strong_signals=parsed.get("strong_signals")
            or fallback_explanation.strong_signals,
            partial_signals=parsed.get("partial_signals")
            or fallback_explanation.partial_signals,
            missing_information=parsed.get("missing_information")
            or fallback_explanation.missing_information,
            potential_gaps=parsed.get("potential_gaps")
            or fallback_explanation.potential_gaps,
            explanation_summary=parsed.get("explanation_summary")
            or fallback_explanation.explanation_summary,
            mode="LIVE_AI",
            provenance="AI_INFERRED",
        )


class MatchmakingService:
    """High-level orchestration service for intelligent, explainable Opnly recommendations."""

    def __init__(self, db: Session, api_key: str | None = None):
        self.db = db
        self.api_key = (api_key if api_key is not None else settings.AI_API_KEY).strip()
        self.deterministic_engine = DeterministicMatchmakingEngine()
        self.gemini_provider = (
            GeminiMatchmakingProvider(api_key=self.api_key) if self.api_key else None
        )

    def _get_user_capabilities(
        self, user_id: str
    ) -> tuple[
        list[str],
        list[str],
        list[str],
        list[str],
        list[str],
        str | None,
    ]:
        """Aggregate skills, services, resources, experience, interests, and industry across individual and business profiles."""
        skills: list[str] = []
        services: list[str] = []
        resources: list[str] = []
        experience: list[str] = []
        interests: list[str] = []
        industry: str | None = None

        # Individual profile
        profile = self.db.scalars(
            select(IndividualProfile).where(IndividualProfile.user_id == user_id)
        ).first()
        if profile:
            skills.extend(profile.skills or [])
            services.extend(profile.services or [])
            resources.extend(profile.resources or [])
            experience.extend(profile.experience or [])
            interests.extend(profile.interests or [])
            if profile.industry:
                industry = profile.industry

        # Businesses owned by user
        businesses = self.db.scalars(
            select(Business).where(Business.user_id == user_id)
        ).all()
        for b in businesses:
            skills.extend(b.skills or [])
            services.extend(b.services or [])
            resources.extend(b.resources or [])
            experience.extend(b.experience or [])
            interests.extend(b.interests or [])
            if not industry and b.industry:
                industry = b.industry

        return (
            list(dict.fromkeys(skills)),
            list(dict.fromkeys(services)),
            list(dict.fromkeys(resources)),
            list(dict.fromkeys(experience)),
            list(dict.fromkeys(interests)),
            industry,
        )

    async def find_opportunities_for_user(
        self, user_id: str, limit: int = 10
    ) -> OpportunityMatchesResponse:
        """Find published opportunities matching the authenticated user's capabilities."""
        (
            user_skills,
            user_services,
            user_resources,
            user_experience,
            user_interests,
            user_industry,
        ) = self._get_user_capabilities(user_id)

        # Query candidate opportunities: PUBLISHED, not created by user, PUBLIC or AUTHENTICATED
        allowed_visibilities = [
            OpportunityVisibility.PUBLIC.value,
            OpportunityVisibility.AUTHENTICATED.value,
        ]
        stmt = (
            select(Opportunity)
            .where(
                Opportunity.status == OpportunityStatus.PUBLISHED.value,
                Opportunity.user_id != user_id,
                Opportunity.visibility.in_(allowed_visibilities),
                Opportunity.closed_at.is_(None),
            )
            .order_by(Opportunity.published_at.desc().nullslast())
        )
        opps = self.db.scalars(stmt).all()

        scored_candidates: list[tuple[Opportunity, MatchExplanation]] = []
        for opp in opps:
            req_skills = opp.required_skills_and_resources or []
            explanation = (
                self.deterministic_engine.score_participant_against_opportunity(
                    participant_skills=user_skills,
                    participant_services=user_services,
                    participant_resources=user_resources,
                    participant_experience=user_experience,
                    participant_interests=user_interests,
                    participant_industry=user_industry,
                    required_skills=req_skills,
                    opportunity_industry=opp.industry,
                )
            )
            scored_candidates.append((opp, explanation))

        # Rank candidates deterministically by score descending, then published_at descending
        scored_candidates.sort(
            key=lambda x: (
                x[1].score,
                x[0].published_at.isoformat() if x[0].published_at else "",
            ),
            reverse=True,
        )

        top_candidates = scored_candidates[:limit]
        final_items: list[OpportunityCandidate] = []
        mode = "DETERMINISTIC_FALLBACK"

        for opp, fallback_exp in top_candidates:
            exp = fallback_exp
            if self.gemini_provider:
                try:
                    exp = await self.gemini_provider.enrich_explanation(
                        opportunity_title=opp.title,
                        opportunity_industry=opp.industry,
                        required_skills=opp.required_skills_and_resources or [],
                        candidate_name="Current User Profile",
                        candidate_skills=user_skills,
                        candidate_services=user_services,
                        candidate_resources=user_resources,
                        candidate_experience=user_experience,
                        candidate_industry=user_industry,
                        fallback_explanation=fallback_exp,
                    )
                    mode = "LIVE_AI"
                except (
                    httpx.HTTPError,
                    json.JSONDecodeError,
                    KeyError,
                    IndexError,
                    ValueError,
                ) as exc:
                    logger.warning(
                        "Gemini live enrichment failed, falling back to deterministic: %s",
                        exc,
                    )
                    exp = fallback_exp

            final_items.append(
                OpportunityCandidate(
                    id=opp.id,
                    title=opp.title,
                    submission_type=opp.submission_type,
                    intent=opp.intent,
                    category=opp.category,
                    industry=opp.industry,
                    required_skills_and_resources=opp.required_skills_and_resources
                    or [],
                    value_proposition=opp.value_proposition,
                    published_at=opp.published_at,
                    explanation=exp,
                )
            )

        return OpportunityMatchesResponse(
            total=len(final_items),
            items=final_items,
            mode=mode,
        )

    async def find_participants_for_opportunity(
        self, opportunity_id: str, user_id: str, limit: int = 10
    ) -> ParticipantMatchesResponse:
        """Find qualified individual and business participants for a creator's opportunity."""
        # 1. Fetch opportunity and verify ownership
        opp = self.db.scalars(
            select(Opportunity).where(Opportunity.id == opportunity_id)
        ).first()
        if not opp:
            raise ValueError("Opportunity not found.")

        if opp.user_id != user_id:
            raise PermissionError(
                "Only the creator of an opportunity can query candidate participants."
            )

        req_skills = opp.required_skills_and_resources or []
        allowed_visibilities = [
            ProfileVisibility.PUBLIC.value,
            ProfileVisibility.AUTHENTICATED.value,
        ]

        # 2. Query Candidate Individual Profiles (non-self, active users, PUBLIC or AUTHENTICATED)
        profile_stmt = (
            select(IndividualProfile, User)
            .join(User, IndividualProfile.user_id == User.id)
            .where(
                IndividualProfile.user_id != user_id,
                User.is_active.is_(True),
                IndividualProfile.visibility.in_(allowed_visibilities),
            )
        )
        profile_results = self.db.execute(profile_stmt).all()

        candidates: list[tuple[ParticipantCandidate, float]] = []

        for prof, usr in profile_results:
            p_skills = prof.skills or []
            p_services = prof.services or []
            p_resources = prof.resources or []
            p_experience = prof.experience or []
            p_interests = prof.interests or []
            exp = self.deterministic_engine.score_participant_against_opportunity(
                participant_skills=p_skills,
                participant_services=p_services,
                participant_resources=p_resources,
                participant_experience=p_experience,
                participant_interests=p_interests,
                participant_industry=prof.industry,
                required_skills=req_skills,
                opportunity_industry=opp.industry,
            )
            # Safe public name without leaking email or private identity
            display_name = usr.full_name or "Independent Professional"
            cand = ParticipantCandidate(
                participant_type="INDIVIDUAL",
                id=prof.user_id,
                name=display_name,
                headline=prof.headline,
                industry=prof.industry,
                location=prof.location,
                skills=p_skills,
                services=p_services,
                resources=p_resources,
                experience=p_experience,
                explanation=exp,
            )
            candidates.append((cand, exp.score))

        # 3. Query Candidate Businesses (non-self, PUBLIC or AUTHENTICATED)
        biz_stmt = select(Business).where(
            Business.user_id != user_id,
            Business.visibility.in_(["PUBLIC", "AUTHENTICATED"]),
        )
        biz_results = self.db.scalars(biz_stmt).all()

        for b in biz_results:
            b_skills = b.skills or []
            b_services = b.services or []
            b_resources = b.resources or []
            b_experience = b.experience or []
            b_interests = b.interests or []
            exp = self.deterministic_engine.score_participant_against_opportunity(
                participant_skills=b_skills,
                participant_services=b_services,
                participant_resources=b_resources,
                participant_experience=b_experience,
                participant_interests=b_interests,
                participant_industry=b.industry,
                required_skills=req_skills,
                opportunity_industry=opp.industry,
            )
            cand = ParticipantCandidate(
                participant_type="BUSINESS",
                id=b.id,
                name=b.name,
                headline=b.description[:100] if b.description else None,
                industry=b.industry,
                location=b.location,
                skills=b_skills,
                services=b_services,
                resources=b_resources,
                experience=b_experience,
                explanation=exp,
            )
            candidates.append((cand, exp.score))

        # Rank candidates by score descending
        candidates.sort(key=lambda x: x[1], reverse=True)
        top_candidates = [c[0] for c in candidates[:limit]]

        mode = "DETERMINISTIC_FALLBACK"
        # Optional Gemini enrichment for top candidates
        if self.gemini_provider:
            for item in top_candidates:
                try:
                    enriched = await self.gemini_provider.enrich_explanation(
                        opportunity_title=opp.title,
                        opportunity_industry=opp.industry,
                        required_skills=req_skills,
                        candidate_name=item.name,
                        candidate_skills=item.skills,
                        candidate_services=item.services,
                        candidate_resources=item.resources,
                        candidate_experience=item.experience,
                        candidate_industry=item.industry,
                        fallback_explanation=item.explanation,
                    )
                    item.explanation = enriched
                    mode = "LIVE_AI"
                except (
                    httpx.HTTPError,
                    json.JSONDecodeError,
                    KeyError,
                    IndexError,
                    ValueError,
                ) as exc:
                    logger.warning("Gemini enrichment failed for participant: %s", exc)

        return ParticipantMatchesResponse(
            opportunity_id=opp.id,
            opportunity_title=opp.title,
            total=len(top_candidates),
            items=top_candidates,
            mode=mode,
        )

    async def find_complementary_opportunities(
        self, opportunity_id: str, user_id: str | None, limit: int = 10
    ) -> OpportunityMatchesResponse:
        """Find published opportunities that have complementary intent and domain overlap."""
        opp = self.db.scalars(
            select(Opportunity).where(Opportunity.id == opportunity_id)
        ).first()
        if not opp:
            raise ValueError("Opportunity not found.")

        # Determine complementary intent
        if opp.intent == OpportunityIntent.SEEKING_SOLUTION.value:
            target_intent = OpportunityIntent.OFFERING_SOLUTION.value
        else:
            target_intent = OpportunityIntent.SEEKING_SOLUTION.value

        allowed_visibilities = [OpportunityVisibility.PUBLIC.value]
        if user_id:
            allowed_visibilities.append(OpportunityVisibility.AUTHENTICATED.value)

        stmt = select(Opportunity).where(
            Opportunity.id != opp.id,
            Opportunity.status == OpportunityStatus.PUBLISHED.value,
            Opportunity.intent == target_intent,
            Opportunity.visibility.in_(allowed_visibilities),
            Opportunity.closed_at.is_(None),
        )
        if user_id:
            stmt = stmt.where(Opportunity.user_id != user_id)

        candidates = self.db.scalars(stmt).all()

        scored: list[tuple[Opportunity, MatchExplanation]] = []
        for cand in candidates:
            exp = self.deterministic_engine.score_opportunities_complementary(opp, cand)
            scored.append((cand, exp))

        scored.sort(key=lambda x: x[1].score, reverse=True)
        top_candidates = scored[:limit]

        final_items: list[OpportunityCandidate] = []
        for c_opp, exp in top_candidates:
            final_items.append(
                OpportunityCandidate(
                    id=c_opp.id,
                    title=c_opp.title,
                    submission_type=c_opp.submission_type,
                    intent=c_opp.intent,
                    category=c_opp.category,
                    industry=c_opp.industry,
                    required_skills_and_resources=c_opp.required_skills_and_resources
                    or [],
                    value_proposition=c_opp.value_proposition,
                    published_at=c_opp.published_at,
                    explanation=exp,
                )
            )

        return OpportunityMatchesResponse(
            total=len(final_items),
            items=final_items,
            mode="DETERMINISTIC_FALLBACK",
        )
