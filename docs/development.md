# Development Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

## Quick Start (Local)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/health

## Building & Pushing Images

Images must be built and pushed to Docker Hub before deploying to Swarm/Portainer.

```bash
# Build
docker compose build

# Tag for Docker Hub
docker tag evilblunts-backend:latest jheidt04/evilblunts-backend:latest
docker tag evilblunts-frontend:latest jheidt04/evilblunts-frontend:latest

# Push
docker push jheidt04/evilblunts-backend:latest
docker push jheidt04/evilblunts-frontend:latest
```

## Deploying to Docker Swarm

### Via CLI

```bash
export $(grep -v '^#' .env | xargs)
docker stack deploy -c docker-compose.yml ebr
```

### Via Portainer Git Integration

1. Push images to Docker Hub (see above)
2. In Portainer, create a new **Stack** → choose **Git Repository**
3. Point to this repo and set `docker-compose.yml` as the compose file
4. Add environment variables: `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `ALLOWED_ORIGINS`
5. Deploy — Portainer pulls the compose file from Git and the images from Docker Hub

> **Note:** `docker stack deploy` ignores `build:` directives. Images must exist in the registry before deploying.

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt

# Run the scraper manually
python -m scraper.run

# Start the API server
uvicorn app.main:app --reload --port 8000
```

Requires a running MongoDB instance on `localhost:27017`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on port 5173 by default. Configure the API proxy in `vite.config.js` for local development.

## Environment Variables

| Variable         | Default                                      | Description                           |
|------------------|----------------------------------------------|---------------------------------------|
| `MONGO_URI`      | `mongodb://localhost:27017/evil_blunts`        | MongoDB connection string             |
| `FORCE_RESEED`   | `false`                                      | Set to `true` to re-scrape and reseed |
| `ALLOWED_ORIGINS` | `http://localhost:3500`                      | Comma-separated CORS origins          |
| `PYTHONUNBUFFERED` | `1`                                        | Ensures real-time log output in Docker |

## Re-seeding the Database

To force a fresh scrape and reseed:

```bash
# Option 1: Environment variable
FORCE_RESEED=true docker compose up --build backend

# Option 2: Drop the MongoDB volume
docker compose down -v
docker compose up --build
```

## Project Structure

```
evil-blunts/
├── docker-compose.yml
├── README.md
├── docs/
│   ├── architecture.md      # System design and API docs
│   ├── scrapers.md           # Scraper details and troubleshooting
│   └── development.md        # This file
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── wikipedia.py      # Wikipedia scraper
│   │   ├── jmail.py          # jmail.world scraper + fallback data
│   │   ├── merge.py          # Fuzzy merge logic
│   │   └── run.py            # Pipeline orchestrator
│   └── app/
│       ├── __init__.py
│       ├── database.py       # Motor (async MongoDB) setup
│       ├── models.py         # Pydantic response models
│       ├── routes.py         # FastAPI endpoints
│       └── main.py           # App entrypoint + CORS
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js            # API client
        ├── components/
        │   ├── Header.jsx
        │   ├── RotationTable.jsx
        │   ├── Seat.jsx
        │   ├── EpsteinSeat.jsx
        │   ├── PersonPicker.jsx
        │   ├── PersonModal.jsx
        │   └── ShareButton.jsx
        └── styles/
            ├── global.css
            ├── table.css
            ├── picker.css
            └── modal.css
```

## Design Notes

- Dark theme (`#0a0a0a`) with noise texture
- Accent: orange (`#ff6b35`), secondary: neon yellow (`#e8ff47`)
- Fonts: Space Grotesk (headings), DM Sans (body)
- Round table seats positioned via trigonometry with Epstein at the top (12 o'clock)
