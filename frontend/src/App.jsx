import { Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1a56db', light: '#3b82f6', dark: '#1e40af' },
    secondary: { main: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
    background: { default: '#f8faff', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h1: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h2: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h3: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)',
          boxShadow: '0 2px 12px rgba(26,86,219,0.25)',
          '&:hover': { boxShadow: '0 4px 20px rgba(26,86,219,0.4)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            '& fieldset': { borderColor: '#cbd5e1' },
            '&:hover fieldset': { borderColor: '#94a3b8' },
            '&.Mui-focused fieldset': { borderColor: '#1a56db', borderWidth: 2 },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)' },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
