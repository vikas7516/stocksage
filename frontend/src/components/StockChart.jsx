import { useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Stack,
  Chip,
} from '@mui/material'

export default function StockChart({ chartData = [], symbol = 'INFY.NS', period = '3mo', onPeriodChange }) {
  const plotRef = useRef(null)
  const [chartType, setChartType] = useState('candle')
  const [subPanel, setSubPanel] = useState('volume')
  const [overlays, setOverlays] = useState(['sma20', 'ema20'])

  useEffect(() => {
    if (!plotRef.current || !chartData.length) return

    const dates = chartData.map((d) => d.date)
    const closes = chartData.map((d) => d.close)
    const opens = chartData.map((d) => d.open)
    const highs = chartData.map((d) => d.high)
    const lows = chartData.map((d) => d.low)
    const volumes = chartData.map((d) => d.volume)

    const traces = []

    if (chartType === 'candle') {
      traces.push({
        type: 'candlestick',
        x: dates,
        open: opens,
        high: highs,
        low: lows,
        close: closes,
        name: symbol,
        increasing: { line: { color: '#059669' }, fillcolor: '#10b981' },
        decreasing: { line: { color: '#dc2626' }, fillcolor: '#ef4444' },
        xaxis: 'x',
        yaxis: 'y',
      })
    } else {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: closes,
        name: 'Close',
        line: { color: '#1a56db', width: 2.2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(26, 86, 219, 0.08)',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    if (overlays.includes('sma20')) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: chartData.map((d) => d.sma20),
        name: 'SMA 20',
        line: { color: '#f59e0b', width: 1.5 },
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    if (overlays.includes('sma50')) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: chartData.map((d) => d.sma50),
        name: 'SMA 50',
        line: { color: '#7c3aed', width: 1.5, dash: 'dot' },
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    if (overlays.includes('ema20')) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: chartData.map((d) => d.ema20),
        name: 'EMA 20',
        line: { color: '#0891b2', width: 1.5, dash: 'dash' },
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    // Lower subplot
    if (subPanel === 'volume') {
      const volColors = chartData.map((d) =>
        d.close >= d.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
      )
      traces.push({
        type: 'bar',
        x: dates,
        y: volumes,
        name: 'Volume',
        marker: { color: volColors },
        xaxis: 'x',
        yaxis: 'y2',
      })
    } else if (subPanel === 'rsi') {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: chartData.map((d) => d.rsi14),
        name: 'RSI (14)',
        line: { color: '#7c3aed', width: 1.8 },
        xaxis: 'x',
        yaxis: 'y2',
      })
    } else if (subPanel === 'macd') {
      traces.push(
        {
          type: 'bar',
          x: dates,
          y: chartData.map((d) => d.macd_hist),
          name: 'MACD Hist',
          marker: {
            color: chartData.map((d) =>
              (d.macd_hist || 0) >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
            ),
          },
          xaxis: 'x',
          yaxis: 'y2',
        },
        {
          type: 'scatter',
          mode: 'lines',
          x: dates,
          y: chartData.map((d) => d.macd),
          name: 'MACD',
          line: { color: '#1a56db', width: 1.6 },
          xaxis: 'x',
          yaxis: 'y2',
        },
        {
          type: 'scatter',
          mode: 'lines',
          x: dates,
          y: chartData.map((d) => d.macd_signal),
          name: 'Signal',
          line: { color: '#f59e0b', width: 1.4 },
          xaxis: 'x',
          yaxis: 'y2',
        }
      )
    }

    const shapes =
      subPanel === 'rsi'
        ? [
            {
              type: 'line',
              xref: 'paper',
              yref: 'y2',
              x0: 0,
              x1: 1,
              y0: 70,
              y1: 70,
              line: { color: 'rgba(239,68,68,0.5)', width: 1, dash: 'dash' },
            },
            {
              type: 'line',
              xref: 'paper',
              yref: 'y2',
              x0: 0,
              x1: 1,
              y0: 30,
              y1: 30,
              line: { color: 'rgba(16,185,129,0.5)', width: 1, dash: 'dash' },
            },
          ]
        : []

    const layout = {
      autosize: true,
      height: 440,
      margin: { l: 55, r: 20, t: 16, b: 36 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      font: { family: 'Inter, system-ui, sans-serif', size: 11, color: '#475569' },
      legend: { orientation: 'h', y: 1.08, x: 0 },
      xaxis: {
        rangeslider: { visible: false },
        gridcolor: '#f1f5f9',
        type: 'category',
        nticks: 8,
      },
      yaxis: {
        domain: [0.3, 1],
        gridcolor: '#f1f5f9',
        tickprefix: '₹',
        title: { text: 'Price (INR)', font: { size: 11 } },
      },
      yaxis2: {
        domain: [0, 0.23],
        gridcolor: '#f1f5f9',
        title: {
          text: subPanel === 'volume' ? 'Volume' : subPanel === 'rsi' ? 'RSI' : 'MACD',
          font: { size: 11 },
        },
        ...(subPanel === 'rsi' ? { range: [0, 100] } : {}),
      },
      shapes,
      hovermode: 'x unified',
    }

    Plotly.react(plotRef.current, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    })
  }, [chartData, chartType, subPanel, overlays, symbol])

  const toggleOverlay = (key) => {
    setOverlays((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  return (
    <Box>
      {/* Controls */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <ToggleButtonGroup
            value={chartType}
            exclusive
            size="small"
            onChange={(_, v) => v && setChartType(v)}
          >
            <ToggleButton value="candle" sx={{ px: 1.5, py: 0.4, fontSize: '0.75rem' }}>
              Candles
            </ToggleButton>
            <ToggleButton value="line" sx={{ px: 1.5, py: 0.4, fontSize: '0.75rem' }}>
              Line
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={subPanel}
            exclusive
            size="small"
            onChange={(_, v) => v && setSubPanel(v)}
          >
            <ToggleButton value="volume" sx={{ px: 1.5, py: 0.4, fontSize: '0.75rem' }}>
              Volume
            </ToggleButton>
            <ToggleButton value="rsi" sx={{ px: 1.5, py: 0.4, fontSize: '0.75rem' }}>
              RSI (14)
            </ToggleButton>
            <ToggleButton value="macd" sx={{ px: 1.5, py: 0.4, fontSize: '0.75rem' }}>
              MACD
            </ToggleButton>
          </ToggleButtonGroup>

          {['sma20', 'sma50', 'ema20'].map((ov) => (
            <Chip
              key={ov}
              label={ov.toUpperCase()}
              size="small"
              clickable
              color={overlays.includes(ov) ? 'primary' : 'default'}
              variant={overlays.includes(ov) ? 'filled' : 'outlined'}
              onClick={() => toggleOverlay(ov)}
              sx={{ fontSize: '0.72rem', fontWeight: 600 }}
            />
          ))}
        </Stack>

        {onPeriodChange && (
          <ToggleButtonGroup
            value={period}
            exclusive
            size="small"
            onChange={(_, v) => v && onPeriodChange(v)}
          >
            {['1mo', '3mo', '6mo', '1y'].map((p) => (
              <ToggleButton key={p} value={p} sx={{ px: 1.3, py: 0.4, fontSize: '0.75rem' }}>
                {p.toUpperCase()}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Stack>

      {chartData.length ? (
        <Box ref={plotRef} sx={{ width: '100%', minHeight: 440 }} />
      ) : (
        <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No chart data available for {symbol}.</Typography>
        </Box>
      )}
    </Box>
  )
}
