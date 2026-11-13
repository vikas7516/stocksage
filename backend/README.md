# StockSage Backend

FastAPI backend for the StockSage NSE stock research platform.

## What It Does

- **JWT Authentication** — verifies Supabase-issued JWTs via `/api/auth/me`
- **Stock Search** — `/api/search` (authenticated) and `/api/search/public` endpoints returning NSE ticker matches
- **Health Check** — `/health` endpoint for uptime monitoring (Render, etc.)
- Structured for future LangGraph agent integration and Supabase DB queries

## Tech Stack

- Python 3.12 + FastAPI 0.115
- Supabase (Postgres + Auth)
- python-jose for JWT verification
- yfinance for market data (agent layer, coming soon)

## Run Locally

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start the dev server
python -m uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (keep secret) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret (from project settings) |
| `FRONTEND_URL` | Frontend origin for CORS (default: `http://localhost:5173`) |
| `ENVIRONMENT` | `development` or `production` |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Root / API info |
| GET | `/health` | No | Health check |
| GET | `/api/auth/me` | Bearer JWT | Current user info |
| GET | `/api/search?q=...` | Bearer JWT | Authenticated stock search |
| GET | `/api/search/public?q=...` | No | Public search (1 result max) |

## Run Tests

```bash
pytest
```

## Docker

```bash
docker build -t stocksage-backend .
docker run -p 8000:8000 --env-file .env stocksage-backend
```
