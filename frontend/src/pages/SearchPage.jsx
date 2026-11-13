import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  Chip,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Fade,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SearchResultModal from '../components/SearchResultModal'
import { useNavigate } from 'react-router-dom'

const ALL_NSE_STOCKS = [
  { symbol: 'INFY', name: 'Infosys Limited', sector: 'Information Technology' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Information Technology' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Limited', sector: 'Energy & Petrochemicals' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', sector: 'Banking & Financial Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', sector: 'Banking & Financial Services' },
  { symbol: 'WIPRO', name: 'Wipro Limited', sector: 'Information Technology' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Limited', sector: 'Automobile' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Public Sector Banking' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited', sector: 'Telecommunications' },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG & Diversified' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Limited', sector: 'FMCG' },
  { symbol: 'LICI', name: 'Life Insurance Corporation of India', sector: 'Insurance' },
  { symbol: 'LT', name: 'Larsen & Toubro Limited', sector: 'Engineering & Construction' },
]

const QUICK_CHIPS = ['Infosys', 'Reliance', 'HDFC Bank', 'TCS', 'Wipro']

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchContainerRef = useRef(null)
  const navigate = useNavigate()

  // Filter stocks dynamically as user types
  const filteredStocks = searchQuery.trim()
    ? ALL_NSE_STOCKS.filter((s) => {
        const q = searchQuery.toLowerCase().trim()
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
        )
      })
    : []

  const handleSelect = (stock) => {
    setSelectedStock(stock.name || stock.symbol)
    setSearchQuery(stock.symbol)
    setShowDropdown(false)
    setModalOpen(true)
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSelectedStock(searchQuery.trim())
      setShowDropdown(false)
      setModalOpen(true)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (filteredStocks.length > 0 && showDropdown) {
        handleSelect(filteredStocks[0])
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'primary.main' }}>
          StockSage
        </Typography>
      </Box>

      {/* Main centered search body */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pb: 10,
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
          by name or ticker symbol — live auto-suggestions enabled
        </Typography>

        {/* Search Bar Container with Auto-complete Dropdown */}
        <Box
          ref={searchContainerRef}
          sx={{
            width: '100%',
            maxWidth: 640,
            position: 'relative',
          }}
        >
          <TextField
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => {
              if (searchQuery.trim()) setShowDropdown(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search company or ticker (e.g. INFY, Reliance, HDFC)..."
            variant="outlined"
            fullWidth
            autoFocus
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: showDropdown && filteredStocks.length > 0 ? '24px 24px 0 0' : '50px',
                fontSize: '1rem',
                pl: 1,
                pr: 0.5,
                py: 0.3,
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
                transition: 'border-radius 0.2s ease',
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

          {/* Google-Style Dropdown Menu */}
          {showDropdown && filteredStocks.length > 0 && (
            <Fade in={showDropdown} timeout={200}>
              <Paper
                elevation={6}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  borderRadius: '0 0 24px 24px',
                  border: '1px solid #e2e8f0',
                  borderTop: 'none',
                  maxHeight: 280,
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                }}
              >
                <List disablePadding>
                  {filteredStocks.map((stock) => (
                    <ListItemButton
                      key={stock.symbol}
                      onClick={() => handleSelect(stock)}
                      sx={{
                        py: 1.2,
                        px: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderBottom: '1px solid #f1f5f9',
                        '&:hover': {
                          backgroundColor: '#f8faff',
                        },
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 18, color: '#1a56db', opacity: 0.8 }} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
                              {stock.symbol}
                            </Typography>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>·</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                              {stock.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.2 }}>
                            NSE · {stock.sector}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </Fade>
          )}
        </Box>

        {/* Quick suggestions chips */}
        <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
          {QUICK_CHIPS.map((s) => (
            <Chip
              key={s}
              label={s}
              size="small"
              clickable
              onClick={() => {
                setSearchQuery(s)
                setSelectedStock(s)
                setModalOpen(true)
              }}
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
        companyName={selectedStock || searchQuery}
      />
    </Box>
  )
}


