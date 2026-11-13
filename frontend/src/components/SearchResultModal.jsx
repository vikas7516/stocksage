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
import { useNavigate } from 'react-router-dom'

const STATUS_STEPS = [
  { label: 'Fetching market data', done: false },
  { label: 'Running technical analysis', done: false },
  { label: 'Analysing fundamentals', done: false },
  { label: 'Compiling results', done: false },
]

const STUB_DATA = [
  { label: 'Exchange', value: 'NSE' },
  { label: 'Sector', value: 'Technology' },
  { label: 'Signal', value: '—' },
]

export default function SearchResultModal({ open, onClose, companyName }) {
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(0)
  const [showResult, setShowResult] = useState(false)

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
    }, 900)

    const resultTimer = setTimeout(() => setShowResult(true), 4000)

    return () => { clearInterval(stepInterval); clearTimeout(resultTimer) }
  }, [open])

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
      {/* Progress bar at top */}
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
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            Research Preview
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
          /* ── Loading state ── */
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
                    width: 20, height: 20, borderRadius: '50%',
                    backgroundColor: idx < stepIdx ? '#1a56db' : idx === stepIdx ? '#bfdbfe' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background-color 0.4s',
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
                    transition: 'color 0.4s',
                  }}
                >
                  {step.label}
                  {idx === stepIdx && (
                    <Box component="span" sx={{ color: '#1a56db' }}> ...</Box>
                  )}
                </Typography>
              </Box>
            ))}
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#94a3b8' }}>
              Agents running independently — this takes a few seconds.
            </Typography>
          </Box>
        ) : (
          /* ── Result state ── */
          <Fade in={showResult} timeout={500}>
            <Box>
              {/* Quick snapshot */}
              <Card
                variant="outlined"
                sx={{ mb: 2.5, borderRadius: '12px', backgroundColor: '#f8faff' }}
              >
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Quick Snapshot
                    </Typography>
                    <Chip label="Preview" size="small" sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#eff6ff', color: '#1a56db', fontWeight: 600 }} />
                  </Box>
                  {STUB_DATA.map((row, idx) => (
                    <Box key={row.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                          {row.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.825rem' }}>
                          {row.value}
                        </Typography>
                      </Box>
                      {idx < STUB_DATA.length - 1 && <Divider />}
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Locked section teaser */}
              <Box
                sx={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  p: 2.5,
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
                    Full report locked
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                    Technical signals, fundamental ratios, news sentiment, risk
                    assessment and recommendation — sign in to unlock.
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => navigate('/login')}
                sx={{ py: 1.4, fontSize: '0.95rem', borderRadius: '10px' }}
              >
                Sign in to see full report →
              </Button>
            </Box>
          </Fade>
        )}
      </DialogContent>
    </Dialog>
  )
}

