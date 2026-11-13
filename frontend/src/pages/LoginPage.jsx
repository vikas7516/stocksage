import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Divider,
  Link,
  Alert
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  const handleAuth = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setInfoMsg('Please fill in both email and password.')
      return
    }
    // Simulation / stub for milestone 1
    console.log(`${isSignUp ? 'Sign up' : 'Sign in'} request:`, { email, password })
    navigate('/dashboard')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        position: 'relative',
      }}
    >
      {/* Top back button */}
      <Box
        sx={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          color: 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
        onClick={() => navigate('/search')}
      >
        <ArrowBackIcon fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Back to Search
        </Typography>
      </Box>

      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
          backgroundColor: '#ffffff',
        }}
      >
        <CardContent sx={{ p: { xs: 3.5, sm: 4.5 } }}>
          {/* Header */}
          <Box sx={{ mb: 3.5, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontSize: '2rem',
                color: 'primary.main',
                mb: 1,
              }}
            >
              StockSage
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, fontSize: '1.25rem' }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              {isSignUp
                ? 'Sign up to unlock detailed agentic stock research'
                : 'Sign in to access your research reports and watchlists'}
            </Typography>
          </Box>

          {infoMsg && (
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: '8px' }} onClose={() => setInfoMsg('')}>
              {infoMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleAuth} noValidate>
            <TextField
              label="Email Address"
              type="email"
              variant="outlined"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@example.com"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              sx={{ mb: 2.5 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{
                py: 1.4,
                fontSize: '0.95rem',
                borderRadius: '8px',
                mb: 2,
              }}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5, color: '#94a3b8', fontSize: '0.75rem' }}>OR</Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Link
                component="button"
                type="button"
                underline="hover"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                }}
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setInfoMsg('')
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Security footnote */}
      <Typography variant="caption" sx={{ mt: 3, color: '#94a3b8' }}>
        Protected by Supabase Auth with standard JWT encryption.
      </Typography>
    </Box>
  )
}

