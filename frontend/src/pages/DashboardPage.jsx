import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GearAnimation from '../components/GearAnimation'
import StockChart from '../components/StockChart'

const QUICK_SWITCH = ['INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'TATAMOTORS']

const WEEK4_AGENTS = [
  { name: 'Fundamental Agent', desc: 'Interprets P/E, ROE, debt & earnings growth via Groq (qwen/qwen3.8-27b).', status: 'Week 4' },
  { name: 'Technical Agent', desc: 'Explains SMA, EMA, RSI, MACD & trend conditions.', status: 'Week 4' },
  { name: 'News & Sentiment Agent', desc: 'Classifies yfinance & Google News RSS headlines with citations.', status: 'Week 4' },
  { name: 'Risk & Supervisor Agents', desc: 'Flags conflicting evidence & compiles final report (Week 4–6).', status: 'Week 4–6' },
]

function fmtVal(val, suffix = '') {
  if (val === null || val === undefined) return 'N/A'
  return `${val}${suffix}`
}

function fmtMarketCap(val) {
  if (!val) return 'N/A'
  const cr = val / 1e7
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSymbol =
    searchParams.get('symbol') ||
    localStorage.getItem('stocksage_last_symbol') ||
    'INFY'

  const [symbol, setSymbol] = useState(initialSymbol)
  const [period, setPeriod] = useState('3mo')
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadSnapshot = async () => {
      setLoading(true)
      setError('')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      try {
        const res = await fetch(
          `${apiUrl}/api/analysis/snapshot?symbol=${encodeURIComponent(symbol)}&period=${period}`
        )
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.detail || `Server responded with ${res.status}`)
        }
        const json = await res.json()
        if (active) {
          setSnapshot(json)
          localStorage.setItem('stocksage_last_symbol', symbol)
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not reach backend analysis API.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSnapshot()
    return () => { active = false }
  }, [symbol, period])

  const handleSwitchSymbol = (nextSym) => {
    setSymbol(nextSym)
    setSearchParams({ symbol: nextSym })
  }

  const tech = snapshot?.technical
  const fund = snapshot?.fundamentals
  const risk = snapshot?.risk
  const news = snapshot?.news || []

  const riskColor =
    risk?.risk_level === 'HIGH'
      ? 'error'
      : risk?.risk_level === 'MODERATE'
      ? 'warning'
      : 'success'

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: 8 }}>
      {/* Top Navigation */}
      <Box
        sx={{
          px: { xs: 2, md: 6 },
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography
            sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'primary.main', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            StockSage
          </Typography>
          <Stack direction="row" spacing={0.8} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {QUICK_SWITCH.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                clickable
                color={symbol.toUpperCase() === s ? 'primary' : 'default'}
                variant={symbol.toUpperCase() === s ? 'filled' : 'outlined'}
                onClick={() => handleSwitchSymbol(s)}
                sx={{ fontWeight: 600, fontSize: '0.72rem' }}
              />
            ))}
          </Stack>
        </Stack>

        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/search')}
          sx={{ borderColor: '#cbd5e1', color: 'text.secondary' }}
        >
          New Search
        </Button>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Chip
              icon={<ShowChartIcon sx={{ fontSize: 16 }} />}
              label="Week 3 · Quantitative Math & Interactive Chart"
              size="small"
              sx={{ mb: 1, backgroundColor: '#eff6ff', color: '#1a56db', fontWeight: 600, border: '1px solid #bfdbfe' }}
            />
            <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, color: 'text.primary' }}>
              {snapshot?.resolved?.company_name || symbol.toUpperCase()}
              <Box component="span" sx={{ fontSize: '1rem', color: 'text.secondary', ml: 1.5, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                {snapshot?.resolved?.yfinance_symbol || `${symbol.toUpperCase()}.NS`}
              </Box>
            </Typography>
          </Box>

          {tech?.latest_price != null && (
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                ₹{tech.latest_price.toLocaleString('en-IN')}
              </Typography>
              {tech.period_return_pct != null && (
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: tech.period_return_pct >= 0 ? '#059669' : '#dc2626',
                  }}
                >
                  {tech.period_return_pct >= 0 ? '+' : ''}
                  {tech.period_return_pct}% ({period.toUpperCase()} return)
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>
            {error} — Ensure the FastAPI backend is running on {import.meta.env.VITE_API_URL || 'http://localhost:8000'}.
          </Alert>
        )}

        {loading ? (
          <Card sx={{ p: 6, textAlign: 'center', borderRadius: '16px', mb: 4 }}>
            <GearAnimation />
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
              Fetching NSE OHLCV & Computing Indicators...
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Running SMA, EMA, RSI, MACD, Fundamental Ratios & Risk Metrics for {symbol.toUpperCase()}
            </Typography>
          </Card>
        ) : snapshot ? (
          <>
            {/* Interactive Stock Price & Technical Indicator Chart */}
            <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <StockChart
                  chartData={tech?.chart_data || []}
                  symbol={snapshot.resolved.yfinance_symbol}
                  period={period}
                  onPeriodChange={setPeriod}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#94a3b8' }}>
                  {tech?.disclaimer}
                </Typography>
              </CardContent>
            </Card>

            {/* Technical, Fundamental, and Risk Metric Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              {/* Technical Summary */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontSize: '1rem' }}>Technical Indicators</Typography>
                      <Chip
                        label={(tech?.signals?.overall_trend || 'N/A').replace('_', ' ').toUpperCase()}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: '0.68rem', fontWeight: 700 }}
                      />
                    </Stack>
                    {[
                      ['SMA (20)', fmtVal(tech?.indicators?.sma20, '')],
                      ['SMA (50)', fmtVal(tech?.indicators?.sma50, '')],
                      ['EMA (20)', fmtVal(tech?.indicators?.ema20, '')],
                      ['RSI (14)', fmtVal(tech?.indicators?.rsi14)],
                      ['MACD / Signal', `${fmtVal(tech?.indicators?.macd)} / ${fmtVal(tech?.indicators?.macd_signal)}`],
                      ['Annualized Volatility', fmtVal(tech?.indicators?.annualized_volatility_pct, '%')],
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{value}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ mt: 1.5 }}>
                      {(tech?.signals?.conditions || []).map((c) => (
                        <Typography key={c.indicator} variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4 }}>
                          • <strong>{c.indicator}:</strong> {c.detail}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Fundamental Ratios */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontSize: '1rem' }}>Fundamental Ratios</Typography>
                      <Chip
                        label={fund?.sector || 'NSE Equity'}
                        size="small"
                        sx={{ fontSize: '0.68rem', fontWeight: 600 }}
                      />
                    </Stack>
                    {[
                      ['Market Cap', fmtMarketCap(fund?.valuation?.market_cap)],
                      ['P/E Ratio', fmtVal(fund?.valuation?.pe_ratio)],
                      ['P/B Ratio', fmtVal(fund?.valuation?.pb_ratio)],
                      ['ROE', fmtVal(fund?.profitability?.roe_pct, '%')],
                      ['Net Margin', fmtVal(fund?.profitability?.net_margin_pct, '%')],
                      ['Operating Margin', fmtVal(fund?.profitability?.operating_margin_pct, '%')],
                      ['Debt / Equity', fmtVal(fund?.financial_stability?.debt_to_equity)],
                      ['Rev Growth (YoY)', fmtVal(fund?.growth?.revenue_growth_yoy_pct, '%')],
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{value}</Typography>
                      </Box>
                    ))}
                    {fund?.data_quality?.warnings?.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: '#b45309' }}>
                        Note: {fund.data_quality.warnings[0]}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Quantitative Risk */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontSize: '1rem' }}>Quantitative Risk</Typography>
                      <Chip
                        label={`${risk?.risk_level || 'N/A'} RISK`}
                        size="small"
                        color={riskColor}
                        sx={{ fontSize: '0.68rem', fontWeight: 700 }}
                      />
                    </Stack>
                    {[
                      ['Max Drawdown', fmtVal(risk?.metrics?.max_drawdown_pct, '%')],
                      ['Peak → Trough', `${fmtVal(risk?.metrics?.peak_price, '')} → ${fmtVal(risk?.metrics?.trough_price, '')}`],
                      ['Current Drawdown', fmtVal(risk?.metrics?.current_drawdown_pct, '%')],
                      ['95% Daily VaR', fmtVal(risk?.metrics?.var_95_daily_pct, '%')],
                      ['Sharpe Proxy (Rf 6.5%)', fmtVal(risk?.metrics?.sharpe_proxy)],
                      ['Volatility (Ann.)', fmtVal(risk?.metrics?.annualized_volatility_pct, '%')],
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{value}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ mt: 1.5 }}>
                      {(risk?.risk_factors || []).map((rf) => (
                        <Typography key={rf} variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4 }}>
                          • {rf}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* News Sources Preview (yfinance + Google RSS) */}
            <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1.5 }}>
                  Recent News Sources (yfinance + Google News RSS)
                </Typography>
                {news.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No recent news headlines retrieved for this symbol.
                  </Typography>
                ) : (
                  <Stack divider={<Divider />} spacing={1.2}>
                    {news.slice(0, 6).map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, pt: idx ? 1 : 0 }}>
                        <Box>
                          <Link
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                          >
                            {item.title}
                            <OpenInNewIcon sx={{ fontSize: 13 }} />
                          </Link>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {item.publisher} · {item.published_at ? item.published_at.slice(0, 10) : 'Recent'} ({item.source_type})
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Week 4 LLM Agents Roadmap Preview */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
          Next Up — Week 4 Multi-Agent AI Reasoning Layer
        </Typography>
        <Grid container spacing={2}>
          {WEEK4_AGENTS.map((stage) => (
            <Grid item xs={12} sm={6} key={stage.name}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{stage.name}</Typography>
                    <Chip label={stage.status} size="small" sx={{ fontSize: '0.68rem', height: 20, fontWeight: 600 }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    {stage.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}
