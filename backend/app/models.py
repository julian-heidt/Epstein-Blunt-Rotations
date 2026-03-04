"""Pydantic response models for the API."""

from pydantic import BaseModel


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
