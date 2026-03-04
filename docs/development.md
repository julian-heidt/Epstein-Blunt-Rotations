# Development Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

## Quick Start

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/health

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
| `MONGO_URI`      | `mongodb://localhost:27017/cursed_rotations`  | MongoDB connection string             |
| `FORCE_RESEED`   | `false`                                      | Set to `true` to re-scrape and reseed |
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
cursed-blunt-rotations/
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
        │   ├── YouSeat.jsx
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
- Round table seats positioned via trigonometry with a "YOU" seat at the top
