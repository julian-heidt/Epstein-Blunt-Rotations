"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.database import get_db, close_db
from app.limiter import limiter
from app.routes import router
from app.leaderboard import router as leaderboard_router


async def _ensure_indexes():
    """Create indexes for the leaderboard collections."""
    db = get_db()
    # Rotations
    await db.rotations.create_index("table_hash", unique=True)
    await db.rotations.create_index([("score", -1)])
    await db.rotations.create_index([("upvotes", -1)])
    await db.rotations.create_index([("downvotes", -1)])
    await db.rotations.create_index([("created_at", -1)])
    await db.rotations.create_index("seat_count")
    # Votes — TTL index auto-deletes expired vote docs
    await db.votes.create_index("expires_at", expireAfterSeconds=0)
    await db.votes.create_index(
        [("table_hash", 1), ("voter_token", 1)], unique=True
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await _ensure_indexes()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="Epstein Blunt Rotations API",
    description="API for the Epstein Blunt Rotation generator.",
    version="1.0.0",
    lifespan=lifespan,
    # Disable auto-generated docs in production
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — read from env so the production domain works
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3500,http://localhost:5173,http://127.0.0.1:3500,http://127.0.0.1:5173",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(leaderboard_router)


@app.get("/")
async def root():
    return {"message": "Cursed Blunt Rotations API. Hit /api/health for status."}
