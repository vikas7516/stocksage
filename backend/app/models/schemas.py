from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class SearchRequest(BaseModel):
    query: str


class TickerResult(BaseModel):
    ticker_symbol: str
    company_name: str
    yfinance_symbol: str
    exchange: str
    sector: Optional[str] = None


class OHLCVRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class DataValidationResult(BaseModel):
    ticker: str
    is_valid: bool
    row_count: int
    issues: List[str]
    null_counts: Dict[str, int]
    duplicates: int
    date_range: Dict[str, str]


class HistoricalDataResponse(BaseModel):
    success: bool
    symbol: str
    period: str
    retrieval_timestamp: str
    company_info: Dict[str, Any]
    validation: DataValidationResult
    data: List[OHLCVRecord]


class SearchResponse(BaseModel):
    results: List[TickerResult]
    query: str


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str

