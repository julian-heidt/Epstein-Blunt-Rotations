"""Leaderboard API routes — save rotations, vote, browse."""

import hashlib
from datetime import datetime, timezone, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from app.database import get_db
from app.limiter import limiter
from app.models import (
    RotationCreate,
    RotationSummary,
    RotationDetail,
    VoteRequest,
    LeaderboardResponse,
)

router = APIRouter(prefix="/api")

ROTATION_PROJECTION = {
    "_id": 0,
    "table_hash": 1,
    "people": 1,
    "seat_count": 1,
    "upvotes": 1,
    "downvotes": 1,
    "score": 1,
}


def _make_table_hash(slugs: list[str]) -> str:
    """Deterministic hash from sorted slugs — identical people sets = same hash."""
    canonical = "|".join(sorted(slugs))
    return hashlib.sha256(canonical.encode()).hexdigest()[:12]


@router.post("/rotations", response_model=RotationSummary)
@limiter.limit("10/minute")
async def save_rotation(request: Request, body: RotationCreate):
    """Save a rotation. If the same combination exists, return it."""
    db = get_db()
    table_hash = _make_table_hash(body.slugs)

    # Check if already exists
    existing = await db.rotations.find_one(
        {"table_hash": table_hash}, ROTATION_PROJECTION
    )
    if existing:
        return existing

    # Look up people snapshots from the people collection
    people_docs = await db.people.find(
        {"slug": {"$in": body.slugs}},
        {"_id": 0, "name": 1, "slug": 1, "photo_url": 1},
    ).to_list(length=20)

    if not people_docs:
        raise HTTPException(status_code=400, detail="No valid people found for given slugs")

    doc = {
        "table_hash": table_hash,
        "slugs": sorted(body.slugs),
        "people": people_docs,
        "seat_count": len(body.slugs),
        "upvotes": 0,
        "downvotes": 0,
        "score": 0,
        "created_at": datetime.now(timezone.utc),
    }

    await db.rotations.insert_one(doc)

    return {
        "table_hash": table_hash,
        "people": people_docs,
        "seat_count": len(body.slugs),
        "upvotes": 0,
        "downvotes": 0,
        "score": 0,
    }


@router.post("/rotations/{table_hash}/vote", response_model=RotationDetail)
@limiter.limit("5/minute")
async def vote_rotation(request: Request, table_hash: str, body: VoteRequest):
    """Upvote or downvote a rotation. One vote per voter_token per day."""
    if body.vote not in (1, -1):
        raise HTTPException(status_code=400, detail="vote must be 1 or -1")

    db = get_db()

    # Verify rotation exists
    rotation = await db.rotations.find_one({"table_hash": table_hash})
    if not rotation:
        raise HTTPException(status_code=404, detail="Rotation not found")

    # Check for existing vote (not yet expired)
    existing_vote = await db.votes.find_one({
        "table_hash": table_hash,
        "voter_token": body.voter_token,
    })

    if existing_vote:
        raise HTTPException(
            status_code=409,
            detail="You already voted on this table today. Come back tomorrow."
        )

    # Insert vote with 24h TTL
    vote_doc = {
        "table_hash": table_hash,
        "voter_token": body.voter_token,
        "vote": body.vote,
        "voted_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    await db.votes.insert_one(vote_doc)

    # Atomically update rotation counts
    inc_fields = {"score": body.vote}
    if body.vote == 1:
        inc_fields["upvotes"] = 1
    else:
        inc_fields["downvotes"] = 1

    await db.rotations.update_one(
        {"table_hash": table_hash},
        {"$inc": inc_fields},
    )

    # Return updated rotation with user's vote
    updated = await db.rotations.find_one(
        {"table_hash": table_hash}, ROTATION_PROJECTION
    )
    return {**updated, "user_vote": body.vote}


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    sort_by: Literal["score", "upvotes", "downvotes", "newest"] = Query("score"),
    seat_count: int | None = Query(None, ge=3, le=7, description="Filter by seat count"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Paginated, filterable, sortable leaderboard."""
    db = get_db()

    query = {}
    if seat_count is not None:
        query["seat_count"] = seat_count

    # Determine sort field
    sort_map = {
        "score": ("score", -1),
        "upvotes": ("upvotes", -1),
        "downvotes": ("downvotes", -1),
        "newest": ("created_at", -1),
    }
    sort_field, sort_dir = sort_map.get(sort_by, ("score", -1))

    total = await db.rotations.count_documents(query)
    skip = (page - 1) * limit

    cursor = (
        db.rotations.find(query, ROTATION_PROJECTION)
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/rotations/{table_hash}", response_model=RotationDetail)
async def get_rotation(
    table_hash: str,
    voter_token: str | None = Query(None, description="Voter token to check vote status"),
):
    """Get a single rotation with optional vote status."""
    db = get_db()

    rotation = await db.rotations.find_one(
        {"table_hash": table_hash}, ROTATION_PROJECTION
    )
    if not rotation:
        raise HTTPException(status_code=404, detail="Rotation not found")

    user_vote = None
    if voter_token:
        vote_doc = await db.votes.find_one({
            "table_hash": table_hash,
            "voter_token": voter_token,
        })
        if vote_doc:
            user_vote = vote_doc["vote"]

    return {**rotation, "user_vote": user_vote}
