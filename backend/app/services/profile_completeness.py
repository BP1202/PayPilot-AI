"""Profile completeness calculator for individual and organization profiles.

Deterministic backend scoring based strictly on filled fields.
Never invents profile values.
"""

from typing import Any

from app.models.business import Business
from app.models.profile import IndividualProfile


def calculate_individual_completeness(
    profile: IndividualProfile | None,
) -> dict[str, Any]:
    """Calculates deterministic completeness percent and missing fields for an individual profile.

    Fields evaluated (6 criteria):
    1. headline
    2. bio
    3. industry
    4. location
    5. skills (at least one skill)
    6. interests (at least one interest)
    """
    if profile is None:
        return {
            "completeness_percent": 0,
            "missing_fields": [
                "headline",
                "bio",
                "industry",
                "location",
                "skills",
                "interests",
            ],
        }

    missing_fields: list[str] = []

    if not (profile.headline and profile.headline.strip()):
        missing_fields.append("headline")

    if not (profile.bio and profile.bio.strip()):
        missing_fields.append("bio")

    if not (profile.industry and profile.industry.strip()):
        missing_fields.append("industry")

    if not (profile.location and profile.location.strip()):
        missing_fields.append("location")

    skills_list = [s for s in (profile.skills or []) if s and str(s).strip()]
    if not skills_list:
        missing_fields.append("skills")

    interests_list = [i for i in (profile.interests or []) if i and str(i).strip()]
    if not interests_list:
        missing_fields.append("interests")

    total_criteria = 6
    completed = total_criteria - len(missing_fields)
    completeness_percent = round((completed / total_criteria) * 100)

    return {
        "completeness_percent": completeness_percent,
        "missing_fields": missing_fields,
    }


def calculate_business_completeness(business: Business | None) -> dict[str, Any]:
    """Calculates deterministic completeness percent and missing fields for a business profile.

    Fields evaluated (6 criteria):
    1. name
    2. description
    3. industry
    4. location / country
    5. skills or services (at least one)
    6. interests or resources (at least one)
    """
    if business is None:
        return {
            "completeness_percent": 0,
            "missing_fields": [
                "name",
                "description",
                "industry",
                "location",
                "skills",
                "interests",
            ],
        }

    missing_fields: list[str] = []

    if not (business.name and business.name.strip()):
        missing_fields.append("name")

    if not (business.description and business.description.strip()):
        missing_fields.append("description")

    if not (business.industry and business.industry.strip()):
        missing_fields.append("industry")

    has_loc = (business.location and business.location.strip()) or (
        business.country and business.country.strip()
    )
    if not has_loc:
        missing_fields.append("location")

    skills_or_services = [
        s for s in (business.skills or []) if s and str(s).strip()
    ] or [s for s in (business.services or []) if s and str(s).strip()]
    if not skills_or_services:
        missing_fields.append("skills")

    interests_or_resources = [
        i for i in (business.interests or []) if i and str(i).strip()
    ] or [r for r in (business.resources or []) if r and str(r).strip()]
    if not interests_or_resources:
        missing_fields.append("interests")

    total_criteria = 6
    completed = total_criteria - len(missing_fields)
    completeness_percent = round((completed / total_criteria) * 100)

    return {
        "completeness_percent": completeness_percent,
        "missing_fields": missing_fields,
    }
