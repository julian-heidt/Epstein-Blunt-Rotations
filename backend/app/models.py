"""Pydantic response models for the API."""

from typing import Annotated
from pydantic import BaseModel, Field, StringConstraints

# Valid slug: lowercase alphanumeric + hyphens, 1–80 chars
SlugStr = Annotated[str, StringConstraints(pattern=r'^[a-z0-9\-]+$', min_length=1, max_length=80)]


class PersonSummary(BaseModel):
    name: str
    slug: str
    photo_url: str | None = None
    has_photo: bool = False
    email_count: int | None = None
    jmail_description: str | None = None
    section_letter: str | None = None


class PersonDetail(BaseModel):
    name: str
    slug: str
    photo_url: str | None = None
    has_photo: bool = False
    description: str = ""
    email_count: int | None = None
    jmail_url: str | None = None
    jmail_description: str | None = None
    wikipedia_url: str | None = None
    section_letter: str | None = None


class HealthResponse(BaseModel):
    status: str
    people_count: int


# --- Leaderboard models ---

class PersonSnapshot(BaseModel):
    """Minimal person data stored in a rotation for leaderboard display."""
    name: str
    slug: str
    photo_url: str | None = None


class RotationCreate(BaseModel):
    """Input: save a rotation to the leaderboard."""
    slugs: list[SlugStr] = Field(..., min_length=3, max_length=7)


class VoteRequest(BaseModel):
    """Input: vote on a rotation."""
    vote: int = Field(..., description="1 for upvote, -1 for downvote")
    voter_token: str = Field(..., min_length=36, max_length=100, pattern=r'^[0-9a-f\-]+$')


class RotationSummary(BaseModel):
    """Leaderboard row."""
    table_hash: str
    people: list[PersonSnapshot]
    seat_count: int
    upvotes: int = 0
    downvotes: int = 0
    score: int = 0


class RotationDetail(RotationSummary):
    """Single rotation detail with user vote status."""
    user_vote: int | None = None  # 1, -1, or None


class LeaderboardResponse(BaseModel):
    """Paginated leaderboard."""
    items: list[RotationSummary]
    total: int
    page: int
    limit: int
