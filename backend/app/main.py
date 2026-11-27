from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, search, analysis, agents
from app.models.schemas import HealthResponse

app = FastAPI(
    title="StockSage API",
    description="NSE stock research platform — agentic advisory, not a broker.",
    version="0.1.0",
)

# CORS — allow the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
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
        version="0.1.0",
        environment=settings.environment
    )


@app.get("/")
def root():
    return {"message": "StockSage API", "docs": "/docs"}
