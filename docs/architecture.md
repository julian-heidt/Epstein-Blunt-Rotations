# Architecture

## System Overview

Cursed Blunt Rotations is a three-tier web application that scrapes, merges, and presents data about people named in the Epstein files.

```
┌────────────┐     ┌────────────┐     ┌──────────┐
│  Frontend   │────▶│  Backend   │────▶│  MongoDB  │
│  React+Vite │     │  FastAPI   │     │  v7       │
│  nginx:3000 │     │  :8000     │     │  :27017   │
└────────────┘     └────────────┘     └──────────┘
       ▲                 │
       │    nginx proxy  │  startup: scrape → seed DB
       └─── /api/ ───────┘
```

All three services run via Docker Compose.

## Services

### MongoDB (`mongo`)
- Image: `mongo:7`
- Persistent volume: `mongo_data`
- Healthcheck: `mongosh --eval "db.runCommand('ping').ok"`
- Database: `cursed_rotations`, collection: `people`
- Indexes: `slug` (unique), `has_photo`, `section_letter`

### Backend (`backend`)
- Image: `python:3.12-slim`
- Port: 8000
- On startup, runs `python -m scraper.run` to scrape + seed, then starts `uvicorn`
- Skips re-seeding if the database already has documents (override with `FORCE_RESEED=true`)
- API framework: FastAPI with async Motor driver for MongoDB

### Frontend (`frontend`)
- Build: `node:20-alpine` → production build with Vite
- Serve: `nginx:alpine` on port 3000
- nginx proxies `/api/` requests to the backend

## Data Flow (Startup)

1. MongoDB starts and passes healthcheck
2. Backend container starts, runs the scraper pipeline:
   - **Step 1**: Scrape Wikipedia for 153 people (name, photo, description, article URL)
   - **Step 2**: Scrape jmail.world for ~221 contacts (name, email count, slug)
   - **Step 3**: Merge via 4-pass fuzzy matching (aliases → slug → normalized name → thefuzz)
   - **Step 4**: Insert merged documents into MongoDB
3. Uvicorn starts serving the FastAPI app on port 8000
4. Frontend nginx serves the React SPA and proxies API calls

## API Endpoints

| Method | Path               | Description                                 |
|--------|--------------------|---------------------------------------------|
| GET    | `/api/health`      | Health check + people count                 |
| GET    | `/api/people`      | List all (filter: `has_photo`, `letter`)    |
| GET    | `/api/people/random` | Random sample of N people with photos     |
| GET    | `/api/people/{slug}` | Full person detail by slug                |

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite 5, plain CSS        |
| Backend   | Python 3.12, FastAPI, Motor (async) |
| Database  | MongoDB 7                           |
| Scraping  | BeautifulSoup4, lxml, requests      |
| Matching  | thefuzz (fuzzy string matching)     |
| Deploy    | Docker Compose (3 services)         |

## License

This project is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Wikipedia-sourced content (biographical text and images) is used under the same license and requires attribution to Wikipedia contributors. See the root [LICENSE](../LICENSE) file for details.
