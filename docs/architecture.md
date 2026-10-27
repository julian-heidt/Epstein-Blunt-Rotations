# Architecture

## System Overview

Evil Blunts is a three-tier web application that scrapes, merges, and presents data about people named in the Epstein files.

```
┌────────────┐     ┌────────────┐     ┌──────────┐
│  Frontend   │────▶│  Backend   │────▶│  MongoDB  │
│  React+Vite │     │  FastAPI   │     │  v7       │
│  nginx:3500 │     │  :8000     │     │  :27017   │
└────────────┘     └────────────┘     └──────────┘
       ▲                 │
       │    nginx proxy  │  startup: scrape → seed DB
       └─── /api/ ───────┘
```

All three services run as a Docker Swarm stack. For local development, run them directly as described in the Development Guide. GitHub Actions publishes the custom images to `ghcr.io/julian-heidt` on every push to `main` that touches `backend/`, `frontend/` or the workflow.

## Services

### MongoDB (`mongo`)
- Image: `mongo:7.0`. It needs a CPU with AVX, so the stack file places it on nodes labelled `avx=true`.
- Persistent volume: `mongo_data`, a local Docker volume that lives on one node. It cannot sit on NFS because WiredTiger needs POSIX file locking.
- Healthcheck: `echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet`
- Database: `evil_blunts`
- `people` collection, written by the scraper. Indexes: `slug` (unique), `has_photo`, `section_letter`.
- `rotations` collection, written by the leaderboard routes. Indexes: `table_hash` (unique), `score`, `upvotes`, `downvotes`, `created_at`, `seat_count`.
- `votes` collection. Indexes: `expires_at` (TTL, so a vote document expires after 24 hours) and `table_hash` with `voter_token` (unique).

### Backend (`backend`)
- Image: `python:3.12-slim`
- Port: 8000
- On startup, runs `python -m scraper.run` to scrape + seed, then starts `uvicorn`
- Skips re-seeding if the database already has documents (override with `FORCE_RESEED=true`)
- API framework: FastAPI with async Motor driver for MongoDB

### Frontend (`frontend`)
- Build: `node:20-alpine` → production build with Vite
- Serve: `nginx:alpine` on port 3500
- nginx proxies `/api/` requests to the backend
- The picker requires 3 to 7 people, matching the backend check on `POST /api/rotations`

## Client address and rate limits

`POST /api/rotations` is limited to 10 per minute and the vote endpoint to 5 per minute, per client address. The address comes from this chain in production, which is visitor, Nginx Proxy Manager (NPM), frontend nginx, backend.

1. NPM sets `X-Real-IP` to the address it saw on the connection. It replaces any `X-Real-IP` the visitor sent.
2. The frontend nginx takes `X-Real-IP` as the client address only when the TCP peer is inside `10.0.0.0/8` (`set_real_ip_from` in `frontend/nginx.conf`). From any other peer it ignores the header and uses the peer address.
3. The frontend nginx sends that address to the backend in `X-Real-IP` and `X-Forwarded-For`. It overwrites both headers, so nothing the visitor sent reaches the backend.
4. The backend (`backend/app/limiter.py`) uses `X-Real-IP` as the limit key only when the TCP peer is inside `TRUSTED_PROXY_CIDRS` (default `10.0.0.0/8`). Otherwise it uses the peer address. It never reads `X-Forwarded-For`, and uvicorn keeps its default of trusting proxy headers from `127.0.0.1` only.

`10.0.0.0/8` is the default Swarm overlay range. If `proxy-net` or `ebr-net` uses a subnet outside it, change `set_real_ip_from` and `TRUSTED_PROXY_CIDRS` together. A wrong range fails safe: every visitor shares one bucket, as before this chain existed. It never lets a visitor choose a bucket.

The chain only works if NPM sees the visitor's real address. That needs NPM's ports 80 and 443 published in host mode, or NPM outside the Swarm routing mesh. Through the mesh, every visitor arrives as a `10.0.0.x` address. The README has a curl check to run after a deploy.

The counters live in the backend's memory, so a backend restart resets them. Each IPv6 address gets its own bucket, so a visitor with a whole /64 can rotate through many.

## Data Flow (Startup)

1. MongoDB starts and passes healthcheck
2. Backend container starts, runs the scraper pipeline:
   - **Step 1**: Scrape Wikipedia for 153 people (name, photo, description, article URL)
   - **Step 2**: Scrape jmail.world for ~221 contacts (name, email count, slug)
   - **Step 3**: Merge via 4-pass fuzzy matching (aliases → slug → normalized name → thefuzz)
   - **Step 4**: Insert merged documents into MongoDB
3. Uvicorn starts serving the FastAPI app on port 8000
4. Frontend nginx serves the React SPA and proxies API calls

The round table always seats Jeffrey Epstein at the 12 o'clock position, with guests placed clockwise around him.

## API Endpoints

| Method | Path               | Description                                 |
|--------|--------------------|---------------------------------------------|
| GET    | `/api/health`      | Health check + people count                 |
| GET    | `/api/people`      | List all (filter: `has_photo`, `letter`)    |
| GET    | `/api/people/random` | Random sample of `count` people (1 to 20) |
| GET    | `/api/people/{slug}` | Full person detail by slug                |
| POST   | `/api/rotations`   | Save a rotation of 3 to 7 distinct slugs. Returns the existing row for the same set. Limited to 10 per minute |
| GET    | `/api/rotations/{table_hash}` | One rotation. With `voter_token`, includes that voter's vote |
| POST   | `/api/rotations/{table_hash}/vote` | Upvote or downvote (`vote` is 1 or -1). One vote per `voter_token` per 24 hours. Limited to 5 per minute |
| GET    | `/api/leaderboard` | Paginated rotations (`sort_by`, `seat_count`, `page`, `limit`) |

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite 6, React Router 7, plain CSS |
| Backend   | Python 3.12, FastAPI, Motor (async) |
| Database  | MongoDB 7.0                         |
| Scraping  | BeautifulSoup4, lxml, requests      |
| Matching  | thefuzz (fuzzy string matching)     |
| Deploy    | Docker Swarm, Portainer, GHCR        |

## License

This project is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Wikipedia-sourced content (biographical text and images) is used under the same license and requires attribution to Wikipedia contributors. See the root [LICENSE](../LICENSE) file for details.
