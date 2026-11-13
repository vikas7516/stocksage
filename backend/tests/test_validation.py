import pytest
import pandas as pd
from datetime import datetime, timedelta
from app.services.market_data import validate_market_data


def test_validate_market_data_clean():
    dates = pd.date_range(start="2024-01-01", periods=10, freq="D")
    df = pd.DataFrame({
        "Open": [100.0 + i for i in range(10)],
        "High": [105.0 + i for i in range(10)],
        "Low": [98.0 + i for i in range(10)],
        "Close": [102.0 + i for i in range(10)],
        "Volume": [1000 * (i + 1) for i in range(10)]
    }, index=dates)

    res = validate_market_data(df, "INFY.NS")
    assert res["is_valid"] is True
    assert res["row_count"] == 10
    assert len(res["issues"]) == 0
    assert res["duplicates"] == 0


def test_validate_market_data_with_duplicates():
    # Intentionally produce duplicate indices
    dates = [datetime(2024, 1, 1), datetime(2024, 1, 1), datetime(2024, 1, 2)]
    df = pd.DataFrame({
        "Open": [100, 100, 102],
        "High": [105, 105, 107],
        "Low": [95, 95, 98],
        "Close": [101, 101, 103],
        "Volume": [500, 500, 600]
    }, index=dates)

    res = validate_market_data(df, "TEST.NS")
    assert res["is_valid"] is False
    assert res["duplicates"] == 1
    assert any("duplicate date" in issue for issue in res["issues"])


def test_validate_market_data_with_nulls():
    dates = pd.date_range(start="2024-01-01", periods=5, freq="D")
    df = pd.DataFrame({
        "Open": [100.0, None, 102.0, 103.0, 104.0],
        "High": [105.0, 106.0, 107.0, 108.0, 109.0],
        "Low": [95.0, 96.0, 97.0, 98.0, 99.0],
        "Close": [101.0, 102.0, 103.0, None, 105.0],
        "Volume": [1000, 1100, 1200, 1300, 1400]
    }, index=dates)

    res = validate_market_data(df, "TEST.NS")
    assert res["is_valid"] is False
    assert res["null_counts"]["Open"] == 1
    assert res["null_counts"]["Close"] == 1


def test_validate_market_data_sanity_checks():
    dates = pd.date_range(start="2024-01-01", periods=3, freq="D")
    df = pd.DataFrame({
        "Open": [100.0, 100.0, 100.0],
        "High": [90.0, 105.0, 105.0],  # Invalid: High < Low on day 1
        "Low": [95.0, 95.0, 95.0],
        "Close": [92.0, 100.0, 100.0],
        "Volume": [100, -5, 100]       # Invalid: negative volume on day 2
    }, index=dates)

    res = validate_market_data(df, "TEST.NS")
    assert res["is_valid"] is False
    assert any("High < Low" in issue for issue in res["issues"])
    assert any("negative volume" in issue for issue in res["issues"])
