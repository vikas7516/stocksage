import { useState } from 'react'
import { Box, Typography, TextField, IconButton, InputAdornment, Chip, Link } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SearchResultModal from '../components/SearchResultModal'
import { useNavigate } from 'react-router-dom'

const SUGGESTIONS = ['Infosys', 'Reliance', 'HDFC Bank', 'TCS', 'Wipro']

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleSearch = () => {
    if (searchQuery.trim()) setModalOpen(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          px: 3, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}
      >
        <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'primary.main' }}>
          StockSage
        </Typography>
      </Box>

      {/* Main centred content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pb: 8, // push slightly above true centre
        }}
      >
        {/* Title */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.4rem', md: '3.2rem' },
            color: 'text.primary',
            mb: 1,
            textAlign: 'center',
          }}
        >
          StockSage
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', mb: 0.5, textAlign: 'center', fontSize: '0.95rem' }}
        >
          Search any NSE-listed company
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: '#94a3b8', mb: 4, textAlign: 'center', fontSize: '0.85rem' }}
        >
          by name or ticker symbol — agents handle the rest
        </Typography>

        {/* Search bar */}
        <TextField
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Reliance, INFY, TATAMOTORS…"
          variant="outlined"
          fullWidth
          autoFocus
          sx={{
            maxWidth: 640,
            '& .MuiOutlinedInput-root': {
              borderRadius: '50px',
              fontSize: '1rem',
              pl: 1,
              pr: 0.5,
              py: 0.3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSearch}
                  sx={{
                    background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    '&:hover': { opacity: 0.9 },
                  }}
                >
                  <SearchIcon sx={{ color: '#fff', fontSize: 20 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Quick suggestions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {SUGGESTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              size="small"
              clickable
              onClick={() => { setSearchQuery(s); setModalOpen(true) }}
              sx={{
                fontSize: '0.78rem',
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                color: 'text.secondary',
                '&:hover': { borderColor: '#1a56db', color: '#1a56db', backgroundColor: '#eff6ff' },
              }}
            />
          ))}
        </Box>

        {/* Footnote */}
        <Typography variant="caption" sx={{ mt: 4, color: '#cbd5e1', textAlign: 'center' }}>
          NSE-listed companies only · Data via yfinance · Not financial advice
        </Typography>
      </Box>

      <SearchResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        companyName={searchQuery}
      />
    </Box>
  )
}

