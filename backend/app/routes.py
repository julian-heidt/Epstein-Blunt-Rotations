"""API routes for the Cursed Blunt Rotation backend."""

from fastapi import APIRouter, HTTPException, Query, Path
from app.database import get_db
from app.models import PersonSummary, PersonDetail, HealthResponse

router = APIRouter(prefix="/api")

# Fields to exclude from list responses (keep it lean)
SUMMARY_PROJECTION = {
    "_id": 0,
    "name": 1,
    "slug": 1,
    "photo_url": 1,
    "has_photo": 1,
    "email_count": 1,
    "jmail_description": 1,
    "section_letter": 1,
}

DETAIL_PROJECTION = {
    "_id": 0,
    "name": 1,
    "slug": 1,
    "photo_url": 1,
    "has_photo": 1,
    "description": 1,
    "email_count": 1,
    "jmail_url": 1,
    "jmail_description": 1,
    "wikipedia_url": 1,
    "section_letter": 1,
}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    db = get_db()
    count = await db.people.count_documents({})
    return {"status": "ok", "people_count": count}


@router.get("/people", response_model=list[PersonSummary])
async def list_people(
    has_photo: bool | None = Query(None, description="Filter to people with photos only"),
    letter: str | None = Query(None, max_length=1, pattern=r'^[A-Za-z]$', description="Filter by section letter (A-Z)"),
):
    db = get_db()
    query = {}
    if has_photo is not None:
        query["has_photo"] = has_photo
    if letter:
        query["section_letter"] = letter.upper()

    cursor = db.people.find(query, SUMMARY_PROJECTION).sort("name", 1)
    results = await cursor.to_list(length=300)
    return results


@router.get("/people/random", response_model=list[PersonSummary])
async def random_people(
    count: int = Query(5, ge=1, le=20, description="Number of random people to return"),
):
    db = get_db()
    pipeline = [
        {"$match": {"has_photo": True}},
        {"$sample": {"size": count}},
        {"$project": SUMMARY_PROJECTION},
    ]
    results = await db.people.aggregate(pipeline).to_list(length=count)
    return results


@router.get("/people/{slug}", response_model=PersonDetail)
async def get_person(slug: str = Path(..., max_length=80, pattern=r'^[a-z0-9\-]+$')):
    db = get_db()
    person = await db.people.find_one({"slug": slug}, DETAIL_PROJECTION)
    if not person:
        raise HTTPException(status_code=404, detail=f"Person '{slug}' not found")
    return person
