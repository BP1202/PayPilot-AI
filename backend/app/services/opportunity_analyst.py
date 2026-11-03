import json
import logging
import re
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from typing import ClassVar

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.models.opportunity import OpportunityType, ProvenanceCategory
from app.schemas.opportunity import (
    OpportunityAnalysisData,
    OpportunityAnalyzeResponse,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the PayPilot AI Business Analyst Agent.
Your role is to structure and analyze early-stage business opportunities from either raw IDEAS or real-world PROBLEMS.
You must adhere strictly to these principles:
1. Zero-Invention Rule: Do NOT fabricate unmentioned traction, customer numbers, revenue figures, investor interest, or partner commitments.
2. Anti-Hallucination: If an attribute is not explicitly mentioned or clearly implied, mark it as an AI hypothesis or state it under missing information.
3. Distinction: Clearly structure the response into the requested JSON schema.
4. Submission Type Sensitivity:
   - For an IDEA submission: Extract the creator's proposed solution and formulate the underlying problem hypothesis, target customers, assumptions, and business models.
   - For a PROBLEM submission: Deepen the problem statement, formulate a potential solution hypothesis, target personas experiencing the problem, assumptions, and business models.

Return a valid, strict JSON object with these exact keys:
{
  "suggested_title": "Concise professional title (3-7 words)",
  "problem_statement": "Clear articulation of the friction, inefficiency, or pain point",
  "proposed_solution": "Clear conceptual solution addressing the friction",
  "target_customer_segments": ["Segment 1", "Segment 2", ...],
  "customer_pain_points": ["Pain point 1", "Pain point 2", ...],
  "value_proposition": "Clear summary of the core commercial or operational benefit delivered",
  "industry": "Primary industry/category (e.g., Logistics, FinTech, Healthcare, Retail, Manufacturing, EdTech)",
  "required_skills_and_resources": ["Skill/resource 1", "Skill/resource 2", ...],
  "potential_business_models": ["Model 1 (e.g. B2B SaaS Subscription)", "Model 2", ...],
  "key_assumptions": ["Assumption 1", "Assumption 2", ...],
  "risks_and_uncertainties": ["Risk 1", "Risk 2", ...],
  "missing_information": ["Missing detail 1 needed from creator", ...],
  "suggested_follow_up_questions": ["Question 1 to ask creator", "Question 2", ...]
}
"""


class BaseAIProvider(ABC):
    @abstractmethod
    async def analyze(
        self, submission_type: OpportunityType, text: str
    ) -> OpportunityAnalysisData:
        pass


class GeminiProvider(BaseAIProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout_seconds: float = 15.0,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout_seconds

    async def analyze(
        self, submission_type: OpportunityType, text: str
    ) -> OpportunityAnalysisData:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        user_prompt = (
            f"Submission Type: {submission_type.value}\n\n"
            f"User Description:\n{text}\n\n"
            "Analyze this opportunity according to the system instructions and return strictly JSON."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SYSTEM_PROMPT},
                        {"text": user_prompt},
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

        # Extract text content from Gemini response structure
        try:
            candidates = data.get("candidates", [])
            content_parts = candidates[0]["content"]["parts"]
            raw_text = content_parts[0]["text"]
        except (IndexError, KeyError) as err:
            raise ValueError(f"Malformed response format from Gemini: {err}") from err

        parsed = json.loads(raw_text)
        analysis_data = OpportunityAnalysisData(**parsed)
        return analysis_data


class OpenAIProvider(BaseAIProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        timeout_seconds: float = 15.0,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout_seconds

    async def analyze(
        self, submission_type: OpportunityType, text: str
    ) -> OpportunityAnalysisData:
        url = "https://api.openai.com/v1/chat/completions"
        user_prompt = (
            f"Submission Type: {submission_type.value}\n\n"
            f"User Description:\n{text}"
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_text = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw_text)
        analysis_data = OpportunityAnalysisData(**parsed)
        return analysis_data


class DeterministicOpportunityAnalyst:
    """Intelligent deterministic heuristic analyst.

    Provides domain-specific, anti-hallucinatory structuring of ideas and problems
    when live external AI APIs are not configured or temporarily unreachable.
    """

    INDUSTRY_PATTERNS: ClassVar[list[tuple[str, list[str]]]] = [
        ("Logistics & Freight", ["logistics", "freight", "shipping", "trucking", "delivery", "warehouse", "cargo"]),
        ("FinTech & Payments", ["payment", "invoice", "banking", "billing", "credit", "escrow", "crypto", "tax"]),
        ("Healthcare & MedTech", ["health", "clinic", "patient", "medical", "doctor", "telemedicine", "hospital"]),
        ("Education & EdTech", ["learning", "course", "student", "teacher", "education", "training", "tutoring"]),
        ("Retail & E-Commerce", ["store", "ecommerce", "e-commerce", "retail", "shop", "marketplace", "goods"]),
        ("Food & Beverage", ["food", "restaurant", "bakery", "beverage", "meal", "coffee", "catering", "dining"]),
        ("Manufacturing & Hardware", ["manufacturing", "factory", "machinery", "industrial", "fabrication", "assembly"]),
        ("CleanTech & Energy", ["solar", "energy", "clean", "sustainable", "carbon", "recycling", "waste"]),
        ("Real Estate & PropTech", ["property", "real estate", "rental", "tenant", "housing", "landlord"]),
        ("Software & Developer Tools", ["software", "developer", "api", "platform", "app", "cloud", "saas"]),
    ]

    def analyze(
        self, submission_type: OpportunityType, text: str
    ) -> OpportunityAnalysisData:
        cleaned = " ".join(text.strip().split())
        text_lower = cleaned.lower()

        # 1. Detect industry
        industry = "General Business & Technology"
        for ind_name, keywords in self.INDUSTRY_PATTERNS:
            if any(re.search(rf"\b{re.escape(k)}\b", text_lower) for k in keywords):
                industry = ind_name
                break

        # 2. Extract title candidate
        first_sentence = re.split(r"[.!?\n]", cleaned)[0].strip()
        words = first_sentence.split()
        if 2 <= len(words) <= 7:
            suggested_title = first_sentence
        elif submission_type == OpportunityType.PROBLEM:
            suggested_title = f"{industry} Problem: " + " ".join(words[:5]) + "..."
        else:
            suggested_title = f"{industry} Opportunity: " + " ".join(words[:5]) + "..."

        # 3. Problem statement & Proposed solution based on submission type
        if submission_type == OpportunityType.PROBLEM:
            problem_statement = cleaned
            proposed_solution = (
                f"Develop an automated or standardized solution addressing: {first_sentence}"
            )
        else:
            proposed_solution = cleaned
            problem_statement = (
                f"Current market friction and operational inefficiencies in {industry.lower()} "
                f"addressed by this concept: {first_sentence}"
            )

        # 4. Target customer segments
        target_customer_segments: list[str] = []
        if any(w in text_lower for w in ["wholesaler", "dealer", "manufacturer", "supplier", "b2b", "enterprise", "business"]):
            target_customer_segments.append(f"Small and mid-market {industry} businesses")
            target_customer_segments.append("Operations and procurement managers")
        elif any(w in text_lower for w in ["freelancer", "builder", "creator", "developer", "engineer"]):
            target_customer_segments.append("Independent specialists and technical creators")
            target_customer_segments.append("Boutique service agencies")
        else:
            target_customer_segments.append(f"Primary stakeholders facing {industry.lower()} bottlenecks")
            target_customer_segments.append("Early adopter individuals and teams")

        # 5. Customer pain points
        customer_pain_points: list[str] = [
            f"Manual, fragmented coordination in {industry.lower()}",
            "Lack of unified workflow transparency and trust",
            "High search and transaction costs",
        ]

        # 6. Value proposition
        value_proposition = (
            f"Eliminates operational frictions in {industry.lower()} by streamlining "
            f"workflow execution, reducing overhead, and delivering measurable time-to-value."
        )

        # 7. Required skills and resources
        required_skills: list[str] = [
            f"{industry} domain expertise",
            "Full-stack software engineering",
            "Product design and UX architecture",
            "Go-to-market and customer discovery strategy",
        ]

        # 8. Potential business models
        business_models: list[str] = [
            "Subscription SaaS (monthly/annual recurring revenue)",
            "Transaction-based fee / Commission per successful match or workflow",
            "Hybrid model with core platform access and premium commercial tooling",
        ]

        # 9. Key assumptions (Hypotheses)
        key_assumptions: list[str] = [
            f"Target customers in {industry.lower()} are actively seeking alternatives to existing methods",
            "Willingness to pay exists if the workflow friction is demonstrably eliminated",
            "Solution can achieve defensible unit economics and retention",
        ]

        # 10. Risks and uncertainties
        risks_and_uncertainties: list[str] = [
            "Customer inertia and reluctance to change established operational habits",
            "Distribution friction and cost of initial customer acquisition",
            "Regulatory, compliance, or data privacy considerations in the target domain",
        ]

        # 11. Missing information
        missing_information: list[str] = [
            "Specific target geographic region and currency focus",
            "Validated initial pricing expectations and customer willingness to pay",
            "Exact current competitive alternatives used by the target users",
            "Initial capital and development timeline requirements",
        ]

        # 12. Suggested follow-up questions
        follow_up_questions: list[str] = [
            "Who is the exact single person (job title or role) who would use this first?",
            "What workaround or tool are they currently using today to handle this problem?",
            "What is the simplest version of this concept that would deliver immediate commercial value?",
        ]

        # Provenance assignment
        provenance = self._compute_provenance(submission_type)

        return OpportunityAnalysisData(
            suggested_title=suggested_title,
            problem_statement=problem_statement,
            proposed_solution=proposed_solution,
            target_customer_segments=target_customer_segments,
            customer_pain_points=customer_pain_points,
            value_proposition=value_proposition,
            industry=industry,
            required_skills_and_resources=required_skills,
            potential_business_models=business_models,
            key_assumptions=key_assumptions,
            risks_and_uncertainties=risks_and_uncertainties,
            missing_information=missing_information,
            suggested_follow_up_questions=follow_up_questions,
            provenance=provenance,
            ai_metadata={
                "provider": "deterministic_heuristic",
                "model": "rule_based_nlp_v1",
                "mode": "DETERMINISTIC_FALLBACK",
                "confidence": 0.80,
                "analyzed_at": datetime.now(UTC).isoformat(),
            },
        )

    def _compute_provenance(
        self, submission_type: OpportunityType
    ) -> dict[str, ProvenanceCategory]:
        return {
            "original_description": ProvenanceCategory.USER_PROVIDED,
            "submission_type": ProvenanceCategory.USER_PROVIDED,
            "suggested_title": ProvenanceCategory.AI_SUGGESTION,
            "problem_statement": (
                ProvenanceCategory.USER_PROVIDED
                if submission_type == OpportunityType.PROBLEM
                else ProvenanceCategory.AI_HYPOTHESIS
            ),
            "proposed_solution": (
                ProvenanceCategory.USER_PROVIDED
                if submission_type == OpportunityType.IDEA
                else ProvenanceCategory.AI_HYPOTHESIS
            ),
            "target_customer_segments": ProvenanceCategory.AI_HYPOTHESIS,
            "customer_pain_points": ProvenanceCategory.AI_HYPOTHESIS,
            "value_proposition": ProvenanceCategory.AI_SUGGESTION,
            "industry": ProvenanceCategory.AI_SUGGESTION,
            "required_skills_and_resources": ProvenanceCategory.AI_SUGGESTION,
            "potential_business_models": ProvenanceCategory.AI_HYPOTHESIS,
            "key_assumptions": ProvenanceCategory.AI_HYPOTHESIS,
            "risks_and_uncertainties": ProvenanceCategory.AI_HYPOTHESIS,
            "missing_information": ProvenanceCategory.MISSING_UNKNOWN,
            "suggested_follow_up_questions": ProvenanceCategory.AI_SUGGESTION,
        }


class OpportunityAnalystService:
    """Service orchestrating opportunity capture and analytical structuring."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key if api_key is not None else settings.AI_API_KEY
        self.deterministic_analyst = DeterministicOpportunityAnalyst()

    def _get_live_provider(self) -> tuple[BaseAIProvider, str, str] | None:
        key = (self.api_key or "").strip()
        if not key:
            return None

        if key.startswith("sk-"):
            return OpenAIProvider(api_key=key), "OpenAI", "gpt-4o-mini"
        return GeminiProvider(api_key=key), "Google Gemini", "gemini-1.5-flash"

    async def analyze(
        self, submission_type: OpportunityType, text: str
    ) -> OpportunityAnalyzeResponse:
        cleaned_text = " ".join(text.strip().split())
        if not cleaned_text:
            raise ValueError("Submission description cannot be empty.")

        live_setup = self._get_live_provider()

        if live_setup is not None:
            provider, provider_name, model_name = live_setup
            try:
                analysis_data = await provider.analyze(submission_type, cleaned_text)
                # Compute and attach provenance categories
                analysis_data.provenance = self.deterministic_analyst._compute_provenance(submission_type)
                analysis_data.ai_metadata = {
                    "provider": provider_name,
                    "model": model_name,
                    "mode": "LIVE_AI",
                    "confidence": 0.92,
                    "analyzed_at": datetime.now(UTC).isoformat(),
                }
                return OpportunityAnalyzeResponse(
                    submission_type=submission_type,
                    original_description=cleaned_text,
                    analysis=analysis_data,
                    mode="LIVE_AI",
                    provider=provider_name,
                    model=model_name,
                    confidence=0.92,
                    message=f"Opportunity analyzed using live AI ({provider_name} {model_name}). Review and refine hypotheses before saving.",
                )
            except (httpx.HTTPError, json.JSONDecodeError, ValueError, KeyError, ValidationError) as e:
                logger.warning(
                    "Live AI provider call failed. Falling back to deterministic analysis: %s",
                    str(e),
                )
                # Fall through to deterministic fallback

        # Deterministic Heuristic Fallback
        fallback_data = self.deterministic_analyst.analyze(submission_type, cleaned_text)
        mode = "DETERMINISTIC_FALLBACK"
        message = (
            "Opportunity structured using PayPilot deterministic heuristic analysis (offline mode). "
            "Please review, enrich, and confirm suggestions before saving."
        )

        return OpportunityAnalyzeResponse(
            submission_type=submission_type,
            original_description=cleaned_text,
            analysis=fallback_data,
            mode=mode,
            provider="Deterministic Heuristic Engine",
            model="rule_based_nlp_v1",
            confidence=0.80,
            message=message,
        )
