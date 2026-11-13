import { Box, Typography, Button, Card, CardContent, Chip, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import GearAnimation from '../components/GearAnimation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import HubIcon from '@mui/icons-material/Hub'
import FactCheckIcon from '@mui/icons-material/FactCheck'

const AGENT_PIPELINE = [
  {
    name: 'Technical Agent',
    desc: 'Calculating RSI, 50/200 DMA, and historical volatility trends.',
    status: 'In Progress',
  },
  {
    name: 'Fundamental Agent',
    desc: 'Parsing quarterly balance sheets, P/E metrics, and operating margins.',
    status: 'Queued',
  },
  {
    name: 'News & Sentiment Agent',
    desc: 'Screening regulatory filings, corporate announcements, and press feeds.',
    status: 'Queued',
  },
  {
    name: 'Supervisor Agent',
    desc: 'Validating data consistency, reconciling conflicts, and generating the report.',
    status: 'Waiting',
  },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navigation */}
      <Box
        sx={{
          px: { xs: 3, md: 6 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          StockSage
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/search')}
          sx={{
            borderColor: '#cbd5e1',
            color: 'text.secondary',
            textTransform: 'none',
          }}
        >
          New Search
        </Button>
      </Box>

      {/* Main Container */}
      <Box
        sx={{
          flex: 1,
          maxWidth: 900,
          width: '100%',
          mx: 'auto',
          py: { xs: 4, md: 6 },
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Chip
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 16 }} />}
          label="Milestone 1 — Architecture Skeleton"
          size="small"
          sx={{
            mb: 2.5,
            px: 1,
            backgroundColor: '#eff6ff',
            color: '#1a56db',
            fontWeight: 600,
            border: '1px solid #bfdbfe',
          }}
        />

        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.75rem' },
            color: 'text.primary',
            mb: 1.5,
          }}
        >
          Research Pipeline Active
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            maxWidth: 580,
            lineHeight: 1.6,
            mb: 4,
          }}
        >
          The multi-agent execution pipeline is currently being integrated for Milestone 2.
          Below is a preview of the orchestration sequence running across your target stock.
        </Typography>

        {/* Dynamic Gear Visual */}
        <Box
          sx={{
            py: 2,
            mb: 4,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <GearAnimation />
        </Box>

        {/* Pipeline Stage Cards */}
        <Grid container spacing={2} sx={{ width: '100%', textAlign: 'left', mb: 4 }}>
          {AGENT_PIPELINE.map((stage) => (
            <Grid item xs={12} sm={6} key={stage.name}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  borderColor: stage.status === 'In Progress' ? 'primary.main' : 'divider',
                  boxShadow: stage.status === 'In Progress' ? '0 4px 20px rgba(26,86,219,0.08)' : 'none',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {stage.name}
                    </Typography>
                    <Chip
                      label={stage.status}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        fontWeight: 600,
                        backgroundColor:
                          stage.status === 'In Progress'
                            ? '#eff6ff'
                            : stage.status === 'Queued'
                            ? '#f8fafc'
                            : '#f1f5f9',
                        color:
                          stage.status === 'In Progress'
                            ? '#1a56db'
                            : '#64748b',
                        border: '1px solid',
                        borderColor:
                          stage.status === 'In Progress'
                            ? '#bfdbfe'
                            : '#e2e8f0',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.825rem', lineHeight: 1.5 }}>
                    {stage.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/search')}
          sx={{
            px: 4,
            py: 1.3,
            fontSize: '0.95rem',
            borderRadius: '8px',
          }}
        >
          Run Another Analysis
        </Button>
      </Box>
    </Box>
  )
}

