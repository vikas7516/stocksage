import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import SearchIcon from '@mui/icons-material/Search'
import GearAnimation from '../components/GearAnimation'
import StockChart from '../components/StockChart'
import AgentChatSidebar from '../components/AgentChatSidebar'
import { API_URL } from '../lib/api'

const QUICK_SWITCH = ['INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'TATAMOTORS']

function fmtVal(val, suffix = '') {
  if (val === null || val === undefined) return 'N/A'
  return `${val}${suffix}`
}

function fmtMarketCap(val) {
  if (!val) return 'N/A'
  const cr = val / 1e7
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
}

function sentimentColor(sentiment) {
  if (sentiment === 'positive') return { bg: '#ecfdf5', fg: '#059669' }
  if (sentiment === 'negative') return { bg: '#fef2f2', fg: '#dc2626' }
  return { bg: '#f1f5f9', fg: '#475569' }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [searchParams, setSearchParams] = useSearchParams()

  const initialSymbol =
    searchParams.get('symbol') ||
    localStorage.getItem('stocksage_last_symbol') ||
    'INFY'

  const [symbol, setSymbol] = useState(initialSymbol)
  const [tickerInput, setTickerInput] = useState(initialSymbol)
  const [period, setPeriod] = useState('3mo')
  const [researchData, setResearchData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  useEffect(() => {
    let active = true
    const loadResearch = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(
          `${API_URL}/api/agents/analyze?symbol=${encodeURIComponent(symbol)}&period=${period}`
        )
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.detail || `Server responded with ${res.status}`)
        }
        const json = await res.json()
        if (active) {
          setResearchData(json)
          localStorage.setItem('stocksage_last_symbol', symbol)
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not reach backend research API.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadResearch()
    return () => { active = false }
  }, [symbol, period])

  const handleSwitchSymbol = (nextSym) => {
    const clean = nextSym.trim().toUpperCase()
    if (!clean) return
    setSymbol(clean)
    setTickerInput(clean)
    setSearchParams({ symbol: clean })
  }

  const tech = researchData?.technical
  const fund = researchData?.fundamentals
  const risk = researchData?.risk
  const agentNews = researchData?.agents?.news?.articles || []
  const newsList = agentNews.length ? agentNews : (researchData?.news || [])

  const riskColor =
    risk?.risk_level === 'HIGH'
      ? 'error'
      : risk?.risk_level === 'MODERATE'
      ? 'warning'
      : 'success'

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
      }}
    >
      {/* Top Navigation Bar */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography
            sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'primary.main', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            StockSage
          </Typography>

          <TextField
            size="small"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSwitchSymbol(tickerInput)}
            placeholder="Ticker (e.g. INFY)"
            sx={{ width: 155, '& .MuiInputBase-root': { height: 32, fontSize: '0.8rem' } }}
            InputProps={{
              endAdornment: (
                <IconButton size="small" onClick={() => handleSwitchSymbol(tickerInput)}>
                  <SearchIcon sx={{ fontSize: 16 }} />
                </IconButton>
              ),
            }}
          />

          <Stack direction="row" spacing={0.6} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {QUICK_SWITCH.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                clickable
                color={symbol.toUpperCase() === s ? 'primary' : 'default'}
                variant={symbol.toUpperCase() === s ? 'filled' : 'outlined'}
                onClick={() => handleSwitchSymbol(s)}
                sx={{ fontWeight: 600, fontSize: '0.7rem', height: 26 }}
              />
            ))}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {!isDesktop && (
            <Button
              variant="contained"
              size="small"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={() => setMobileChatOpen(true)}
            >
              Agent Chat
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/search')}
            sx={{ borderColor: '#cbd5e1', color: 'text.secondary' }}
          >
            Search
          </Button>
        </Stack>
      </Box>

      {/* Main Split Workspace: Left Charts & Reports | Right Agent Chat Sidebar */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT PANE: Diagrams, Charts, Metrics & News Reports */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 2, md: 3 },
          }}
        >
          {/* Stock Header */}
          <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Chip
                icon={<ShowChartIcon sx={{ fontSize: 15 }} />}
                label="NSE Equity Research · Multi-Agent Advisory"
                size="small"
                sx={{ mb: 1, backgroundColor: '#eff6ff', color: '#1a56db', fontWeight: 600, border: '1px solid #bfdbfe' }}
              />
              <Typography variant="h3" sx={{ fontSize: { xs: '1.65rem', md: '2.15rem' }, color: 'text.primary' }}>
                {researchData?.resolved?.company_name || symbol.toUpperCase()}
                <Box component="span" sx={{ fontSize: '0.95rem', color: 'text.secondary', ml: 1.5, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                  {researchData?.resolved?.yfinance_symbol || `${symbol.toUpperCase()}.NS`}
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
              {error} — Ensure the FastAPI backend is running on {API_URL}.
            </Alert>
          )}

          {loading ? (
            <Card sx={{ p: 5, textAlign: 'center', borderRadius: '16px' }}>
              <GearAnimation />
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
                Running Multi-Agent Research Pipeline...
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Fetching NSE OHLCV, computing ratios & invoking Fundamental, Technical, News, and Risk agents for {symbol.toUpperCase()}
              </Typography>
            </Card>
          ) : researchData ? (
            <>
              {/* Interactive Price & Indicator Chart */}
              <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
                  <StockChart
                    chartData={tech?.chart_data || []}
                    symbol={researchData.resolved.yfinance_symbol}
                    period={period}
                    onPeriodChange={setPeriod}
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94a3b8' }}>
                    {tech?.disclaimer}
                  </Typography>
                </CardContent>
              </Card>

              {/* Quantitative Reports Grid */}
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                {/* Technical Report */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                        <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Technical Report</Typography>
                        <Chip
                          label={(tech?.signals?.overall_trend || 'N/A').replace('_', ' ').toUpperCase()}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', fontWeight: 700, height: 21 }}
                        />
                      </Stack>
                      {[
                        ['SMA (20)', fmtVal(tech?.indicators?.sma20)],
                        ['SMA (50)', fmtVal(tech?.indicators?.sma50)],
                        ['EMA (20)', fmtVal(tech?.indicators?.ema20)],
                        ['RSI (14)', fmtVal(tech?.indicators?.rsi14)],
                        ['MACD / Signal', `${fmtVal(tech?.indicators?.macd)} / ${fmtVal(tech?.indicators?.macd_signal)}`],
                        ['Volatility (Ann.)', fmtVal(tech?.indicators?.annualized_volatility_pct, '%')],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px solid #f1f5f9' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{value}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Fundamental Report */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                        <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Fundamental Report</Typography>
                        <Chip label={fund?.sector || 'NSE'} size="small" sx={{ fontSize: '0.65rem', fontWeight: 600, height: 21 }} />
                      </Stack>
                      {[
                        ['Market Cap', fmtMarketCap(fund?.valuation?.market_cap)],
                        ['P/E Ratio', fmtVal(fund?.valuation?.pe_ratio)],
                        ['P/B Ratio', fmtVal(fund?.valuation?.pb_ratio)],
                        ['ROE', fmtVal(fund?.profitability?.roe_pct, '%')],
                        ['Net Margin', fmtVal(fund?.profitability?.net_margin_pct, '%')],
                        ['Debt / Equity', fmtVal(fund?.financial_stability?.debt_to_equity)],
                        ['Rev Growth (YoY)', fmtVal(fund?.growth?.revenue_growth_yoy_pct, '%')],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.55, borderBottom: '1px solid #f1f5f9' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{value}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Risk Report */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                        <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Risk Assessment</Typography>
                        <Chip
                          label={`${risk?.risk_level || 'N/A'} RISK`}
                          size="small"
                          color={riskColor}
                          sx={{ fontSize: '0.65rem', fontWeight: 700, height: 21 }}
                        />
                      </Stack>
                      {[
                        ['Max Drawdown', fmtVal(risk?.metrics?.max_drawdown_pct, '%')],
                        ['Peak → Trough', `${fmtVal(risk?.metrics?.peak_price)} → ${fmtVal(risk?.metrics?.trough_price)}`],
                        ['Current Drawdown', fmtVal(risk?.metrics?.current_drawdown_pct, '%')],
                        ['95% Daily VaR', fmtVal(risk?.metrics?.var_95_daily_pct, '%')],
                        ['Sharpe Proxy', fmtVal(risk?.metrics?.sharpe_proxy)],
                        ['Volatility (Ann.)', fmtVal(risk?.metrics?.annualized_volatility_pct, '%')],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px solid #f1f5f9' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{value}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* News Citations Report */}
              <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontSize: '0.98rem' }}>
                      News & Source Citations (yfinance + Google RSS)
                    </Typography>
                    {researchData?.agents?.news?.overall_sentiment && (
                      <Chip
                        label={`OVERALL: ${researchData.agents.news.overall_sentiment.toUpperCase()}`}
                        size="small"
                        sx={{ fontSize: '0.68rem', fontWeight: 700 }}
                      />
                    )}
                  </Stack>

                  {newsList.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No recent news headlines retrieved for this symbol.
                    </Typography>
                  ) : (
                    <Stack divider={<Divider />} spacing={1.2}>
                      {newsList.slice(0, 8).map((item, idx) => {
                        const sColor = sentimentColor(item.sentiment)
                        return (
                          <Box key={idx} sx={{ pt: idx ? 1 : 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                              <Box>
                                <Link
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  underline="hover"
                                  sx={{ fontWeight: 600, fontSize: '0.86rem', color: 'text.primary', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                >
                                  {item.title}
                                  <OpenInNewIcon sx={{ fontSize: 13 }} />
                                </Link>
                                {item.takeaway && item.takeaway !== item.title && (
                                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.3 }}>
                                    {item.takeaway}
                                  </Typography>
                                )}
                                <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mt: 0.3 }}>
                                  {item.publisher} · {item.published_at ? item.published_at.slice(0, 10) : 'Recent'}
                                </Typography>
                              </Box>
                              {item.sentiment && (
                                <Chip
                                  label={item.sentiment.toUpperCase()}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.64rem', fontWeight: 700, bgcolor: sColor.bg, color: sColor.fg, flexShrink: 0 }}
                                />
                              )}
                            </Stack>
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </Box>

        {/* RIGHT SIDEBAR: Agent Chat UI (Desktop fixed pane, Mobile drawer) */}
        {isDesktop ? (
          <Box
            sx={{
              width: { lg: 410, xl: 450 },
              borderLeft: '1px solid',
              borderColor: 'divider',
              height: '100%',
              flexShrink: 0,
            }}
          >
            <AgentChatSidebar symbol={symbol} researchData={researchData} loading={loading} />
          </Box>
        ) : (
          <Drawer
            anchor="right"
            open={mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
            PaperProps={{ sx: { width: '90vw', maxWidth: 420 } }}
          >
            <AgentChatSidebar symbol={symbol} researchData={researchData} loading={loading} />
          </Drawer>
        )}
      </Box>
    </Box>
  )
}
