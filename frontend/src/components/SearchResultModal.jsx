import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  LinearProgress,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  Button,
  Fade,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { API_URL } from '../lib/api'
import { useNavigate } from 'react-router-dom'

const STATUS_STEPS = [
  { label: 'Resolving NSE ticker mapping' },
  { label: 'Retrieving 3-month OHLCV data' },
  { label: 'Computing SMA, EMA, RSI & MACD indicators' },
  { label: 'Preparing research preview' },
]

export default function SearchResultModal({ open, onClose, companyName }) {
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [previewData, setPreviewData] = useState({
    exchange: 'NSE',
    symbol: '',
    latestPrice: '—',
    periodReturn: '—',
    rsi14: '—',
    trend: '—',
  })

  useEffect(() => {
    if (!open) {
      setStepIdx(0)
      setShowResult(false)
      return
    }

    const stepInterval = setInterval(() => {
      setStepIdx((prev) => {
        if (prev < STATUS_STEPS.length - 1) return prev + 1
        clearInterval(stepInterval)
        return prev
      })
    }, 650)

    const fetchPreview = async () => {
      const cleanSym = (companyName || '').trim()
      const fallbackSymbol = cleanSym ? `${cleanSym.toUpperCase()}.NS` : 'INFY.NS'

      try {
        const res = await fetch(
          `${API_URL}/api/analysis/technical?symbol=${encodeURIComponent(cleanSym)}&period=3mo`
        )
        if (res.ok) {
          const json = await res.json()
          const ret = json.period_return_pct
          setPreviewData({
            exchange: 'NSE',
            symbol: json.symbol || fallbackSymbol,
            latestPrice: json.latest_price != null ? `₹${json.latest_price}` : '—',
            periodReturn: ret != null ? `${ret >= 0 ? '+' : ''}${ret}%` : '—',
            rsi14: json.indicators?.rsi14 != null ? String(json.indicators.rsi14) : '—',
            trend: (json.signals?.overall_trend || '—').replace('_', ' ').toUpperCase(),
          })
        } else {
          setPreviewData({
            exchange: 'NSE',
            symbol: fallbackSymbol,
            latestPrice: 'Unavailable',
            periodReturn: '—',
            rsi14: '—',
            trend: 'Pending backend',
          })
        }
      } catch {
        setPreviewData({
          exchange: 'NSE',
          symbol: fallbackSymbol,
          latestPrice: 'Backend offline',
          periodReturn: '—',
          rsi14: '—',
          trend: 'Start FastAPI to view',
        })
      }
    }

    fetchPreview()
    const resultTimer = setTimeout(() => setShowResult(true), 2600)

    return () => {
      clearInterval(stepInterval)
      clearTimeout(resultTimer)
    }
  }, [open, companyName])

  const rows = [
    { label: 'Exchange', value: previewData.exchange },
    { label: 'Resolved Symbol', value: previewData.symbol },
    { label: 'Latest Close', value: previewData.latestPrice },
    { label: '3-Month Return', value: previewData.periodReturn },
    { label: 'RSI (14)', value: previewData.rsi14 },
    { label: 'Historical Signal', value: previewData.trend },
  ]

  const isLoggedIn = Boolean(localStorage.getItem('stocksage_token') || localStorage.getItem('stocksage_user'))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={250}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        },
      }}
    >
      {!showResult && <LinearProgress sx={{ height: 3 }} />}

      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          pb: 1,
          pt: showResult ? 3 : 2.5,
          px: 3,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
            }}
          >
            Market Data & Indicator Preview
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.3 }}>
            {companyName || 'Company'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', mt: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 3, px: 3 }}>
        {!showResult ? (
          <Box sx={{ py: 2 }}>
            {STATUS_STEPS.map((step, idx) => (
              <Box
                key={step.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 0.9,
                  opacity: idx <= stepIdx ? 1 : 0.3,
                  transition: 'opacity 0.4s ease',
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: idx < stepIdx ? '#1a56db' : idx === stepIdx ? '#bfdbfe' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx < stepIdx && <CheckCircleOutlineIcon sx={{ fontSize: 13, color: '#fff' }} />}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: idx <= stepIdx ? 'text.primary' : '#94a3b8',
                    fontWeight: idx === stepIdx ? 600 : 400,
                    fontSize: '0.875rem',
                  }}
                >
                  {step.label}
                  {idx === stepIdx && <Box component="span" sx={{ color: '#1a56db' }}> ...</Box>}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Fade in={showResult} timeout={400}>
            <Box>
              <Card variant="outlined" sx={{ mb: 2.5, borderRadius: '12px', backgroundColor: '#f8faff' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      3-Month Snapshot
                    </Typography>
                    <Chip
                      label="yfinance Live"
                      size="small"
                      sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#eff6ff', color: '#1a56db', fontWeight: 600 }}
                    />
                  </Box>
                  {rows.map((row, idx) => (
                    <Box key={row.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                          {row.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.825rem' }}>
                          {row.value}
                        </Typography>
                      </Box>
                      {idx < rows.length - 1 && <Divider />}
                    </Box>
                  ))}
                </CardContent>
              </Card>

              <Box
                sx={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  p: 2,
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor: '#fafafa',
                }}
              >
                <LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 22, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.3 }}>
                    Interactive Chart, Ratios & Risk Dashboard
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                    View candlestick + SMA/EMA/RSI/MACD charts, fundamental ratios, drawdown risk & news citations.
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() =>
                  navigate(
                    isLoggedIn
                      ? `/dashboard?symbol=${encodeURIComponent(companyName || 'INFY')}`
                      : '/login'
                  )
                }
                sx={{ py: 1.4, fontSize: '0.95rem', borderRadius: '10px' }}
              >
                {isLoggedIn ? 'Open Interactive Chart & Analysis →' : 'Sign in to see full dashboard →'}
              </Button>
            </Box>
          </Fade>
        )}
      </DialogContent>
    </Dialog>
  )
}
