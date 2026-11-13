import { Box, Typography, Button, Container, Grid, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PsychologyIcon from '@mui/icons-material/Psychology'
import BarChartIcon from '@mui/icons-material/BarChart'
import ArticleIcon from '@mui/icons-material/Article'

const FEATURES = [
  {
    icon: <TrendingUpIcon sx={{ fontSize: 28, color: '#1a56db' }} />,
    title: 'Technical Analysis',
    desc: 'RSI, MACD, moving averages and volatility — computed from 3 months of NSE price data.',
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 28, color: '#7c3aed' }} />,
    title: 'Fundamental Analysis',
    desc: 'P/E, revenue trends, debt levels and profitability ratios sourced from financial statements.',
  },
  {
    icon: <PsychologyIcon sx={{ fontSize: 28, color: '#059669' }} />,
    title: 'Multi-Agent Research',
    desc: 'Four specialised AI agents run independently and a supervisor compiles the final report.',
  },
  {
    icon: <ArticleIcon sx={{ fontSize: 28, color: '#d97706' }} />,
    title: 'News & Sentiment',
    desc: 'Recent filings, announcements and financial news summarised with source citations.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <Box
        component="nav"
        sx={{
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid', borderColor: 'divider',
          backgroundColor: 'rgba(248,250,255,0.85)',
          backdropFilter: 'blur(12px)',
          px: { xs: 3, md: 6 }, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'primary.main', letterSpacing: '-0.02em' }}
        >
          StockSage
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate('/search')}
          sx={{ px: 2.5, py: 0.8, fontSize: '0.85rem' }}
        >
          Get Started
        </Button>
      </Box>

      {/* ── Hero ── */}
      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, pb: 10, textAlign: 'center' }}>
        <Chip
          label="NSE · Multi-Agent · Advisory"
          size="small"
          sx={{
            mb: 3, px: 1,
            backgroundColor: '#eff6ff',
            color: '#1a56db',
            fontWeight: 600,
            fontSize: '0.75rem',
            border: '1px solid #bfdbfe',
          }}
        />

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.8rem', sm: '4rem', md: '5rem' },
            lineHeight: 1.1,
            color: 'text.primary',
            mb: 3,
          }}
        >
          Research NSE stocks
          <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
            {' '}intelligently
          </Box>
          .
        </Typography>

        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '1rem', md: '1.15rem' },
            color: 'text.secondary',
            maxWidth: 560,
            mx: 'auto',
            lineHeight: 1.75,
            mb: 5,
          }}
        >
          Search a company, and four specialised agents independently analyse its
          technical signals, fundamentals, news sentiment and risk — then compile
          a consolidated research report.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/search')}
            sx={{ px: 5, py: 1.5, fontSize: '1rem' }}
          >
            Start researching
          </Button>
          <Button
            variant="outlined"
            size="large"
            sx={{ px: 5, py: 1.5, fontSize: '1rem', borderColor: '#cbd5e1', color: 'text.secondary' }}
            onClick={() => navigate('/search')}
          >
            See a demo
          </Button>
        </Box>

        {/* Disclaimer */}
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 4, color: '#94a3b8', fontSize: '0.72rem' }}
        >
          StockSage is a research tool, not a broker or financial advisor.
          Analysis is for informational purposes only.
        </Typography>
      </Container>

      {/* ── Divider line ── */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />

      {/* ── Features ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Typography
          variant="h3"
          sx={{ textAlign: 'center', mb: 1, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: 'text.primary' }}
        >
          Four agents. One report.
        </Typography>
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary', mb: 7, fontSize: '0.95rem' }}
        >
          Each agent runs independently. The supervisor checks completeness and
          flags conflicts before writing the final output.
        </Typography>

        <Grid container spacing={3}>
          {FEATURES.map((f) => (
            <Grid item xs={12} sm={6} key={f.title}>
              <Box
                sx={{
                  p: 3.5,
                  borderRadius: '14px',
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  height: '100%',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.09)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ mb: 1.5 }}>{f.icon}</Box>
                <Typography variant="h6" sx={{ mb: 1, color: 'text.primary', fontSize: '1rem' }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {f.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── CTA Banner ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)',
          py: { xs: 7, md: 9 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h2"
            sx={{ color: '#fff', mb: 2, fontSize: { xs: '1.9rem', md: '2.6rem' } }}
          >
            Start your first search.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.75)', mb: 4, fontSize: '1rem' }}
          >
            Type a company name or NSE ticker — agents do the rest.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/search')}
            sx={{
              px: 6, py: 1.5, fontSize: '1rem',
              backgroundColor: '#fff',
              color: '#1a56db',
              '&:hover': { backgroundColor: '#f0f4ff' },
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              background: '#fff',
            }}
          >
            Search a stock
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box
        component="footer"
        sx={{
          borderTop: '1px solid', borderColor: 'divider',
          py: 3, px: { xs: 3, md: 6 },
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1,
        }}
      >
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
          StockSage
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Built for NSE-listed companies · Data via yfinance · Not financial advice
        </Typography>
      </Box>

    </Box>
  )
}

