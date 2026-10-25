# Development Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

## Quick Start (Local)

`docker-compose.yml` is a Swarm stack file. It has no `build:` keys, publishes no ports, expects the external `proxy-net` network and pulls private GHCR images, so `docker compose up` does not work with it. Run the three pieces directly:

```bash
docker run -d --name ebr-mongo -p 127.0.0.1:27017:27017 mongo:7.0

cd backend
pip install -r requirements.txt
MONGO_HOST=localhost:27017 python -m scraper.run
MONGO_HOST=localhost:27017 uvicorn app.main:app --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8000/api/health

## Building & Pushing Images

GitHub Actions builds and pushes both images on every push to `main` that touches `backend/`, `frontend/` or the workflow (`.github/workflows/build.yml`). You do not build or push by hand for a deployment. To build locally for a smoke test:

```bash
docker build -t evilblunts-backend:dev ./backend
docker build -t evilblunts-frontend:dev ./frontend
```

Pushed images live at `ghcr.io/julian-heidt/evilblunts-backend` and `ghcr.io/julian-heidt/evilblunts-frontend`, tagged `latest` and `sha-<short commit>`. The packages are private; see the README's Deployment section for how the Swarm authenticates and what to do when `latest` is broken.

## Deploying to Docker Swarm

### Via CLI

The manager needs a GHCR login first, or `--with-registry-auth` sends no credentials. `docker login` prompts for a classic PAT with `read:packages`, which never goes on the command line. The README's "Deploying by hand" section says where to get one.

```bash
docker login ghcr.io -u julian-heidt
export $(grep -v '^#' .env | xargs)
docker stack deploy --with-registry-auth -c docker-compose.yml ebr
```

### Via Portainer Git Integration

1. Merge to `main` and wait for the **Build** workflow to go green
2. In Portainer, create a new **Stack** → choose **Git Repository**
3. Point to this repo and set `docker-compose.yml` as the compose file
4. Add environment variables: `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `ALLOWED_ORIGINS`
5. Deploy. Portainer pulls the compose file from Git and the images from `ghcr.io` (the `ghcr-julian-heidt` registry must exist in Portainer first, with access to the Swarm environment). The README's Deployment section lists the GitOps settings.

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

Requires a running MongoDB instance. The `docker run` command under Quick Start starts one without authentication and binds it to localhost only. The default `MONGO_HOST` is `mongo:27017`, the Swarm service name, so set `MONGO_HOST=localhost:27017` when MongoDB runs on your machine (see Quick Start).

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
| `MONGO_URI`      | unset                                        | Full connection string. When set, it replaces the four variables below |
| `MONGO_HOST`     | `mongo:27017`                                | MongoDB host and port                 |
| `MONGO_DB`       | `evil_blunts`                                | Database name                         |
| `MONGO_USERNAME`, `MONGO_PASSWORD` | unset                      | Credentials (auth database `admin`). Authentication is on only when both are set |
| `FORCE_RESEED`   | `false`                                      | Set to `true` to re-scrape and reseed |
| `ALLOWED_ORIGINS` | `http://localhost:3500,http://localhost:5173,http://127.0.0.1:3500,http://127.0.0.1:5173` | Comma-separated CORS origins |
| `PYTHONUNBUFFERED` | `1`                                        | Ensures real-time log output in Docker |

## Re-seeding the Database

To force a fresh scrape and reseed:

```bash
# Option 1: Environment variable (replaces the people collection only)
cd backend
FORCE_RESEED=true MONGO_HOST=localhost:27017 python -m scraper.run

# Option 2: Remove the MongoDB container and its anonymous volumes (-v), which deletes saved rotations and votes
docker rm -fv ebr-mongo
docker run -d --name ebr-mongo -p 127.0.0.1:27017:27017 mongo:7.0
```

## Project Structure

```
evil-blunts/
├── .github/workflows/build.yml  # Builds and pushes both images to GHCR
├── .env.example
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
│       ├── models.py         # Pydantic request and response models
│       ├── routes.py         # People endpoints
│       ├── leaderboard.py    # Rotation, vote and leaderboard endpoints
│       ├── limiter.py        # slowapi rate limiter
│       └── main.py           # App entrypoint, CORS, index creation
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js            # API client
        ├── components/
        │   ├── Header.jsx
        │   ├── NavBar.jsx
        │   ├── RotationTable.jsx
        │   ├── Seat.jsx
        │   ├── EpsteinSeat.jsx
        │   ├── YouSeat.jsx
        │   ├── PersonPicker.jsx
        │   ├── PersonModal.jsx
        │   ├── ShareButton.jsx
        │   ├── VoteButtons.jsx
        │   └── Leaderboard.jsx
        └── styles/
            ├── global.css
            ├── nav.css
            ├── table.css
            ├── picker.css
            ├── modal.css
            └── leaderboard.css
```

## Design Notes

- Two themes, `blueprint` and `forest`, each with a dark and a light mode. `NavBar.jsx` sets `data-theme` and `data-mode` on the `<html>` element and stores the choice in localStorage (`ebr-theme`, `ebr-mode`). The colour tokens are in `styles/global.css`.
- Fonts: Syne (headings) and DM Sans (body), requested from Google Fonts in `index.html`
- Round table seats positioned via trigonometry with Epstein at the top (12 o'clock)
