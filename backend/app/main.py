from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, search, analysis, agents
from app.models.schemas import HealthResponse

app = FastAPI(
    title="StockSage API",
    description="NSE stock research platform — agentic advisory, not a broker.",
    version="0.2.0",
)

# Build clean CORS origin list (strip trailing slashes; ignore wildcard '*' when credentials=True)
configured_origins = [
    origin.strip().rstrip("/")
    for origin in (settings.frontend_url or "").split(",")
    if origin.strip() and origin.strip() != "*"
]
allowed_origins = list(dict.fromkeys([
    *configured_origins,
    "https://stocksage-frontend-0wht.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]))

# Allow Render / Cloudflare Pages preview subdomains and local dev ports cleanly
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.(onrender\.com|pages\.dev)$|^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(search.router)
app.include_router(analysis.router)
app.include_router(agents.router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint — used by Render to verify the service is up."""
    return HealthResponse(
        status="ok",
        version="0.2.0",
        environment=settings.environment,
    )


@app.get("/")
def root():
    return {"message": "StockSage API", "docs": "/docs"}
