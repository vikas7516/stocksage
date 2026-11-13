from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SearchRequest(BaseModel):
    query: str  # company name or ticker


class TickerResult(BaseModel):
    ticker_symbol: str
    company_name: str
    yfinance_symbol: str
    exchange: str
    sector: Optional[str] = None


class SearchResponse(BaseModel):
    results: list[TickerResult]
    query: str


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
