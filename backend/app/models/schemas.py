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


class TechnicalCondition(BaseModel):
    indicator: str
    signal: str
    detail: str


class TechnicalChartPoint(BaseModel):
    date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: int = 0
    sma20: Optional[float] = None
    sma50: Optional[float] = None
    ema20: Optional[float] = None
    rsi14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    latest_price: Optional[float] = None
    period_return_pct: Optional[float] = None
    indicators: Dict[str, Optional[float]]
    signals: Dict[str, Any]
    disclaimer: str
    chart_data: List[TechnicalChartPoint]


class FundamentalAnalysisResponse(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    currency: str = "INR"
    valuation: Dict[str, Any]
    profitability: Dict[str, Any]
    growth: Dict[str, Any]
    financial_stability: Dict[str, Any]
    data_quality: Dict[str, Any]


class RiskAnalysisResponse(BaseModel):
    symbol: str
    risk_level: str
    metrics: Dict[str, Any]
    risk_factors: List[str]
    limitations: List[str]


class NewsItem(BaseModel):
    title: str
    source_url: str
    publisher: str
    published_at: Optional[str] = None
    source_type: str


class StockSnapshotResponse(BaseModel):
    resolved: TickerResult
    period: str
    technical: TechnicalAnalysisResponse
    fundamentals: FundamentalAnalysisResponse
    risk: RiskAnalysisResponse
    news: List[NewsItem]

