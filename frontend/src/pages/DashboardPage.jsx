import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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

function fmtCrores(val) {
  if (!val) return 'N/A'
  const cr = val / 1e7
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
}

function sentimentColor(sentiment) {
  if (sentiment === 'positive') return { bg: '#ecfdf5', fg: '#059669' }
  if (sentiment === 'negative') return { bg: '#fef2f2', fg: '#dc2626' }
  return { bg: '#f1f5f9', fg: '#475569' }
}

function MetricRow({ label, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: 0.75,
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', color: 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
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
  const histFin = fund?.historical_financials || []

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
        backgroundColor: '#ffffff',
      }}
    >
      {/* Top Bar */}
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
              Agent Feed
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

      {/* Split Workspace: Clean Flat Reports/Charts Left | Agent Analysis Sidebar Right */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT PANE */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, md: 4 }, py: 3 }}>
          {/* Company Title & Price */}
          <Box
            sx={{
              pb: 2.5,
              mb: 3,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.6 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {researchData?.resolved?.exchange || 'NSE'} · {fund?.sector || researchData?.resolved?.sector || 'Equity'}
                </Typography>
              </Stack>
              <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, color: 'text.primary' }}>
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
                    {tech.period_return_pct}% ({period.toUpperCase()} change)
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {error} — Ensure the FastAPI backend is running on {API_URL}.
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <GearAnimation />
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
                Fetching NSE Data & Running Research Agents...
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Computing indicators, financial ratios, drawdown risk & news sentiment for {symbol.toUpperCase()}
              </Typography>
            </Box>
          ) : researchData ? (
            <>
              {/* Stock Price & Indicator Diagram (Flat, directly on canvas) */}
              <Box sx={{ pb: 3, mb: 3.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <StockChart
                  chartData={tech?.chart_data || []}
                  symbol={researchData.resolved.yfinance_symbol}
                  period={period}
                  onPeriodChange={setPeriod}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94a3b8' }}>
                  {tech?.disclaimer}
                </Typography>
              </Box>

              {/* 3-Column Flat Financial Breakdown (No Boxes/Cards) */}
              <Grid container spacing={4} sx={{ pb: 3.5, mb: 3.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Grid item xs={12} md={4}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.07em' }}>
                      Technical Indicators
                    </Typography>
                    <Chip
                      label={(tech?.signals?.overall_trend || 'N/A').replace('_', ' ').toUpperCase()}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontSize: '0.64rem', fontWeight: 700, height: 20 }}
                    />
                  </Stack>
                  <MetricRow label="SMA (20)" value={fmtVal(tech?.indicators?.sma20)} />
                  <MetricRow label="SMA (50)" value={fmtVal(tech?.indicators?.sma50)} />
                  <MetricRow label="EMA (20)" value={fmtVal(tech?.indicators?.ema20)} />
                  <MetricRow label="RSI (14)" value={fmtVal(tech?.indicators?.rsi14)} />
                  <MetricRow label="MACD / Signal" value={`${fmtVal(tech?.indicators?.macd)} / ${fmtVal(tech?.indicators?.macd_signal)}`} />
                  <MetricRow label="Volatility (Ann.)" value={fmtVal(tech?.indicators?.annualized_volatility_pct, '%')} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="overline" sx={{ display: 'block', fontWeight: 800, color: 'text.primary', letterSpacing: '0.07em', mb: 1.5 }}>
                    Fundamentals & Ratios
                  </Typography>
                  <MetricRow label="Market Cap" value={fmtCrores(fund?.valuation?.market_cap)} />
                  <MetricRow label="P/E Ratio" value={fmtVal(fund?.valuation?.pe_ratio)} />
                  <MetricRow label="P/B Ratio" value={fmtVal(fund?.valuation?.pb_ratio)} />
                  <MetricRow label="ROE" value={fmtVal(fund?.profitability?.roe_pct, '%')} />
                  <MetricRow label="Net Profit Margin" value={fmtVal(fund?.profitability?.net_margin_pct, '%')} />
                  <MetricRow label="Debt / Equity" value={fmtVal(fund?.financial_stability?.debt_to_equity)} />
                  <MetricRow label="Rev Growth (YoY)" value={fmtVal(fund?.growth?.revenue_growth_yoy_pct, '%')} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.07em' }}>
                      Quantitative Risk
                    </Typography>
                    <Chip
                      label={`${risk?.risk_level || 'N/A'} RISK`}
                      size="small"
                      color={riskColor}
                      sx={{ fontSize: '0.64rem', fontWeight: 700, height: 20 }}
                    />
                  </Stack>
                  <MetricRow label="Max Drawdown" value={fmtVal(risk?.metrics?.max_drawdown_pct, '%')} />
                  <MetricRow label="Peak → Trough" value={`${fmtVal(risk?.metrics?.peak_price)} → ${fmtVal(risk?.metrics?.trough_price)}`} />
                  <MetricRow label="Current Drawdown" value={fmtVal(risk?.metrics?.current_drawdown_pct, '%')} />
                  <MetricRow label="95% Daily VaR" value={fmtVal(risk?.metrics?.var_95_daily_pct, '%')} />
                  <MetricRow label="Sharpe Proxy (Rf 6.5%)" value={fmtVal(risk?.metrics?.sharpe_proxy)} />
                  <MetricRow label="Volatility (Ann.)" value={fmtVal(risk?.metrics?.annualized_volatility_pct, '%')} />
                </Grid>
              </Grid>

              {/* Multi-Year Historical Financial Performance Table */}
              {histFin.length > 0 && (
                <Box sx={{ pb: 3.5, mb: 3.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="overline" sx={{ display: 'block', fontWeight: 800, color: 'text.primary', letterSpacing: '0.07em', mb: 1 }}>
                    Historical Financial Performance
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', pl: 0 }}>Fiscal Period</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Total Revenue</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', pr: 0 }}>Net Income</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {histFin.map((row) => (
                        <TableRow key={row.period}>
                          <TableCell sx={{ pl: 0, fontWeight: 600 }}>{row.period}</TableCell>
                          <TableCell align="right">{fmtCrores(row.revenue)}</TableCell>
                          <TableCell align="right" sx={{ pr: 0 }}>{fmtCrores(row.net_income)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* News & Citations Section (Flat List) */}
              <Box sx={{ pb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.07em' }}>
                    News & Source Citations (yfinance + Google RSS)
                  </Typography>
                  {researchData?.agents?.news?.overall_sentiment && (
                    <Chip
                      label={`SENTIMENT: ${researchData.agents.news.overall_sentiment.toUpperCase()}`}
                      size="small"
                      sx={{ fontSize: '0.66rem', fontWeight: 700 }}
                    />
                  )}
                </Stack>

                {newsList.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No recent news headlines retrieved for this symbol.
                  </Typography>
                ) : (
                  <Stack divider={<Divider />} spacing={1.4}>
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
                                sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                              >
                                {item.title}
                                <OpenInNewIcon sx={{ fontSize: 13 }} />
                              </Link>
                              {item.takeaway && item.takeaway !== item.title && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.35 }}>
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
              </Box>
            </>
          ) : null}
        </Box>

        {/* RIGHT SIDEBAR: Structured Agent Analysis Feed + Chat */}
        {isDesktop ? (
          <Box
            sx={{
              width: { lg: 430, xl: 470 },
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
            PaperProps={{ sx: { width: '90vw', maxWidth: 440 } }}
          >
            <AgentChatSidebar symbol={symbol} researchData={researchData} loading={loading} />
          </Drawer>
        )}
      </Box>
    </Box>
  )
}
