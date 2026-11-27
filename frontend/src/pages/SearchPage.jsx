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
  CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SearchResultModal from '../components/SearchResultModal'
import { API_URL } from '../lib/api'
import { useNavigate } from 'react-router-dom'

const FALLBACK_STOCKS = [
  { ticker_symbol: 'INFY', company_name: 'Infosys Limited', yfinance_symbol: 'INFY.NS', exchange: 'NSE', sector: 'Information Technology' },
  { ticker_symbol: 'TCS', company_name: 'Tata Consultancy Services Limited', yfinance_symbol: 'TCS.NS', exchange: 'NSE', sector: 'Information Technology' },
  { ticker_symbol: 'RELIANCE', company_name: 'Reliance Industries Limited', yfinance_symbol: 'RELIANCE.NS', exchange: 'NSE', sector: 'Energy' },
  { ticker_symbol: 'HDFCBANK', company_name: 'HDFC Bank Limited', yfinance_symbol: 'HDFCBANK.NS', exchange: 'NSE', sector: 'Banking & Financial Services' },
  { ticker_symbol: 'ICICIBANK', company_name: 'ICICI Bank Limited', yfinance_symbol: 'ICICIBANK.NS', exchange: 'NSE', sector: 'Banking & Financial Services' },
  { ticker_symbol: 'WIPRO', company_name: 'Wipro Limited', yfinance_symbol: 'WIPRO.NS', exchange: 'NSE', sector: 'Information Technology' },
  { ticker_symbol: 'TATAMOTORS', company_name: 'Tata Motors Limited', yfinance_symbol: 'TATAMOTORS.NS', exchange: 'NSE', sector: 'Automobile' },
  { ticker_symbol: 'SBIN', company_name: 'State Bank of India', yfinance_symbol: 'SBIN.NS', exchange: 'NSE', sector: 'Banking & Financial Services' },
]

const QUICK_CHIPS = [
  { symbol: 'INFY', label: 'Infosys' },
  { symbol: 'RELIANCE', label: 'Reliance' },
  { symbol: 'HDFCBANK', label: 'HDFC Bank' },
  { symbol: 'TCS', label: 'TCS' },
  { symbol: 'TATAMOTORS', label: 'Tata Motors' },
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchContainerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSuggestions([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `${API_URL}/api/search/public?q=${encodeURIComponent(q)}&limit=8`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.results || [])
        } else {
          throw new Error('Search API error')
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        const qLower = q.toLowerCase()
        setSuggestions(
          FALLBACK_STOCKS.filter(
            (s) =>
              s.ticker_symbol.toLowerCase().includes(qLower) ||
              s.company_name.toLowerCase().includes(qLower) ||
              (s.sector || '').toLowerCase().includes(qLower)
          )
        )
      } finally {
        setSearching(false)
      }
    }, 180)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery])

  const openStockModal = (symbolOrName) => {
    const clean = symbolOrName.trim()
    if (!clean) return
    localStorage.setItem('stocksage_last_symbol', clean.toUpperCase())
    setSelectedStock(clean)
    setShowDropdown(false)
    setModalOpen(true)
  }

  const handleSelect = (stock) => {
    setSearchQuery(stock.ticker_symbol)
    openStockModal(stock.ticker_symbol)
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      openStockModal(searchQuery.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0 && showDropdown) {
        handleSelect(suggestions[0])
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
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
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'primary.main' }}>
            StockSage
          </Typography>
        </Box>
        <Typography
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          Dashboard →
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
          by name or ticker symbol — backed by NSE ticker_map
        </Typography>

        {/* Search Bar Container */}
        <Box
          ref={searchContainerRef}
          sx={{ width: '100%', maxWidth: 640, position: 'relative' }}
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
            placeholder="Search company or ticker (e.g. INFY, Reliance, HDFC, HAL)..."
            variant="outlined"
            fullWidth
            autoFocus
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: showDropdown && suggestions.length > 0 ? '24px 24px 0 0' : '50px',
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
                  {searching && <CircularProgress size={18} sx={{ mr: 1 }} />}
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

          {/* Auto-complete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <Fade in={showDropdown} timeout={180}>
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
                  maxHeight: 300,
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                }}
              >
                <List disablePadding>
                  {suggestions.map((stock) => (
                    <ListItemButton
                      key={stock.ticker_symbol}
                      onClick={() => handleSelect(stock)}
                      sx={{
                        py: 1.2,
                        px: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderBottom: '1px solid #f1f5f9',
                        '&:hover': { backgroundColor: '#f8faff' },
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 18, color: '#1a56db', opacity: 0.8 }} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
                              {stock.ticker_symbol}
                            </Typography>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>·</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                              {stock.company_name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.2 }}>
                            {stock.exchange} · {stock.sector || 'Equity'}
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
              key={s.symbol}
              label={s.label}
              size="small"
              clickable
              onClick={() => {
                setSearchQuery(s.symbol)
                openStockModal(s.symbol)
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
