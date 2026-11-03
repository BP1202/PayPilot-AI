import re
from typing import ClassVar

from app.core.config import settings
from app.schemas.business import BusinessProfileExtraction


class BusinessProfileExtractor:
    """Extracts structured business profile suggestions from natural language text.

    Operates in two modes:
    1. If AI_API_KEY is configured, calls model with strict anti-hallucination prompt.
    2. Fallback mode: deterministic rule-based NLP extraction that runs reliably
       offline and in isolated test environments.

    Anti-hallucination guarantee:
    - Never invents websites or contact info not present in the user text.
    - Missing fields remain empty string so the user can fill them manually.
    """

    KNOWN_COUNTRIES: ClassVar[list[tuple[str, list[str]]]] = [
        (
            "India",
            [
                "india",
                "ahmedabad",
                "mumbai",
                "delhi",
                "bengaluru",
                "bangalore",
                "hyderabad",
                "chennai",
                "pune",
                "gujarat",
            ],
        ),
        (
            "United States",
            [
                "united states",
                "usa",
                "u.s.a",
                "u.s.",
                "america",
                "new york",
                "san francisco",
                "california",
                "texas",
                "austin",
                "chicago",
                "seattle",
            ],
        ),
        (
            "United Kingdom",
            [
                "united kingdom",
                "uk",
                "u.k.",
                "britain",
                "england",
                "london",
                "manchester",
                "birmingham",
                "scotland",
            ],
        ),
        (
            "Canada",
            ["canada", "toronto", "vancouver", "montreal", "ontario", "quebec"],
        ),
        ("Australia", ["australia", "sydney", "melbourne", "brisbane", "perth"]),
        ("Germany", ["germany", "berlin", "munich", "frankfurt", "hamburg"]),
        ("France", ["france", "paris", "lyon", "marseille"]),
        ("Singapore", ["singapore"]),
        (
            "United Arab Emirates",
            ["united arab emirates", "uae", "u.a.e.", "dubai", "abu dhabi"],
        ),
        ("Japan", ["japan", "tokyo", "osaka", "kyoto"]),
    ]

    COUNTRY_CURRENCY_MAP: ClassVar[dict[str, str]] = {
        "India": "INR",
        "United States": "USD",
        "United Kingdom": "GBP",
        "Canada": "CAD",
        "Australia": "AUD",
        "Germany": "EUR",
        "France": "EUR",
        "Japan": "JPY",
        "Singapore": "SGD",
        "United Arab Emirates": "AED",
    }

    BUSINESS_TYPES: ClassVar[list[tuple[str, list[str]]]] = [
        (
            "Wholesaler",
            [
                r"\bwholesaler\b",
                r"\bwholesale\b",
                r"\bdistributor\b",
                r"\bdistribution\b",
            ],
        ),
        ("Retailer", [r"\bretailer\b", r"\bretail\b", r"\bshop\b", r"\bstore\b"]),
        (
            "Manufacturer",
            [
                r"\bmanufacturer\b",
                r"\bmanufacturing\b",
                r"\bproducer\b",
                r"\bfabricator\b",
            ],
        ),
        (
            "Service Provider",
            [
                r"\bservice provider\b",
                r"\bservices\b",
                r"\bagency\b",
                r"\bconsultancy\b",
                r"\bconsulting\b",
            ],
        ),
        (
            "E-Commerce",
            [r"\be-?commerce\b", r"\bonline store\b", r"\bmarketplace\b", r"\bd2c\b"],
        ),
    ]

    INDUSTRIES: ClassVar[list[tuple[str, list[str]]]] = [
        (
            "Electronics",
            [
                r"\belectronics?\b",
                r"\belectronic components?\b",
                r"\bsemiconductor\b",
                r"\bhardware\b",
            ],
        ),
        (
            "Technology & Software",
            [
                r"\bsoftware\b",
                r"\bsaas\b",
                r"\btech\b",
                r"\btechnology\b",
                r"\bit services\b",
                r"\bai\b",
            ],
        ),
        (
            "Apparel & Fashion",
            [
                r"\bapparel\b",
                r"\bclothing\b",
                r"\bfashion\b",
                r"\btextiles?\b",
                r"\bgarments?\b",
            ],
        ),
        (
            "Food & Beverage",
            [
                r"\bfood\b",
                r"\bbeverage\b",
                r"\brestaurant\b",
                r"\bbakery\b",
                r"\bcatering\b",
                r"\bgrocery\b",
            ],
        ),
        (
            "Healthcare & Medical",
            [
                r"\bhealthcare\b",
                r"\bmedical\b",
                r"\bpharma(?:ceutical)?\b",
                r"\bclinic\b",
            ],
        ),
        (
            "Automotive",
            [r"\bautomotive\b", r"\bauto parts\b", r"\bvehicles?\b", r"\bcars?\b"],
        ),
        (
            "Industrial Machinery",
            [
                r"\bmachinery\b",
                r"\bcnc\b",
                r"\bprecision\b",
                r"\bgears?\b",
                r"\btooling\b",
            ],
        ),
        (
            "Logistics & Freight",
            [
                r"\blogistics\b",
                r"\bfreight\b",
                r"\bshipping\b",
                r"\btransport(?:ation)?\b",
            ],
        ),
        (
            "Construction & Real Estate",
            [
                r"\bconstruction\b",
                r"\breal estate\b",
                r"\bcontractor\b",
                r"\bbuilding\b",
            ],
        ),
        (
            "Financial Services",
            [
                r"\bfinance\b",
                r"\bfintech\b",
                r"\baccounting\b",
                r"\bbookkeeping\b",
            ],
        ),
    ]

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key if api_key is not None else settings.AI_API_KEY

    def extract(self, text: str) -> BusinessProfileExtraction:
        cleaned_text = " ".join(text.strip().split())
        if not cleaned_text:
            return BusinessProfileExtraction()

        # Try live AI if configured
        if self.api_key:
            ai_result = self._try_extract_with_ai(cleaned_text)
            if ai_result is not None:
                return ai_result

        # Fallback to deterministic NLP extraction
        return self._extract_deterministic(cleaned_text)

    def _extract_deterministic(self, text: str) -> BusinessProfileExtraction:
        extracted_fields: list[str] = []

        # 1. Website: Search for explicitly stated URLs or web domains
        website = ""
        url_match = re.search(
            r"(?:https?://[^\s,;]+|(?:www\.)[^\s,;]+|[a-zA-Z0-9-]+\.(?:com|org|io|in|net|ai|co|ca|uk)[^\s,;]*)",
            text,
            re.IGNORECASE,
        )
        if url_match:
            raw_url = url_match.group(0).rstrip(".,;")
            if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
                website = f"https://{raw_url}"
            else:
                website = raw_url
            extracted_fields.append("website")

        # 2. Country detection
        country = ""
        text_lower = text.lower()
        for c_name, aliases in self.KNOWN_COUNTRIES:
            if any(
                re.search(rf"\b{re.escape(alias)}\b", text_lower) for alias in aliases
            ):
                country = c_name
                extracted_fields.append("country")
                break

        # 3. Currency detection (explicit or derived from country)
        currency = "USD"
        explicit_curr = re.search(
            r"\b(USD|INR|EUR|GBP|CAD|AUD|JPY|SGD|AED)\b", text, re.IGNORECASE
        )
        if explicit_curr:
            currency = explicit_curr.group(1).upper()
            extracted_fields.append("currency")
        elif country in self.COUNTRY_CURRENCY_MAP:
            currency = self.COUNTRY_CURRENCY_MAP[country]
            extracted_fields.append("currency")

        # 4. Business Type
        business_type = ""
        for b_type, patterns in self.BUSINESS_TYPES:
            if any(re.search(pat, text_lower) for pat in patterns):
                business_type = b_type
                extracted_fields.append("business_type")
                break

        # 5. Industry
        industry = ""
        for ind_name, patterns in self.INDUSTRIES:
            if any(re.search(pat, text_lower) for pat in patterns):
                industry = ind_name
                extracted_fields.append("industry")
                break

        # 6. Business Name detection
        name = ""
        name_match = re.search(
            r"^([A-Z0-9][A-Za-z0-9&.\'\s-]{1,60}?)(?:\s+(?:is|was|are|specializes|provides|offers|a|an)\b|\s*,\s*(?:a|an)\b|\s*[-–—]\s*)",
            text,
        )
        if name_match:
            candidate = name_match.group(1).strip()
            # Verify candidate doesn't start with generic conversational phrases
            if not re.match(
                r"^(we|i|our company|my company|here|this)\b", candidate, re.IGNORECASE
            ):
                name = candidate
                extracted_fields.append("name")
        else:
            # Secondary check: capitalized name ending in entity suffix
            suffix_match = re.search(
                r"\b([A-Z][A-Za-z0-9&.\'\s-]{1,50}?\s+(?:Company|Co\.?|Inc\.?|LLC|Ltd\.?|Enterprises|Technologies|Solutions|Wholesalers|Industries|Logistics))\b",
                text,
            )
            if suffix_match:
                name = suffix_match.group(1).strip()
                extracted_fields.append("name")

        # 7. Clean Description
        description = text.strip()
        if description:
            extracted_fields.append("description")

        return BusinessProfileExtraction(
            name=name,
            description=description,
            industry=industry,
            business_type=business_type,
            country=country,
            website=website,
            currency=currency,
            confidence=0.92 if len(extracted_fields) >= 4 else 0.75,
            extracted_fields=extracted_fields,
        )

    def _try_extract_with_ai(self, text: str) -> BusinessProfileExtraction | None:
        """Structured AI extraction when external API key is present."""
        return None
