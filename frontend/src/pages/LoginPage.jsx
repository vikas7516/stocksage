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
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successNotification, setSuccessNotification] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      if (!supabase) {
        console.warn('Supabase client not initialized with environment keys. Using local demo fallback.')
        localStorage.setItem('stocksage_user', JSON.stringify({ email }))
        setSuccessNotification('Signed in successfully (Demo mode). Redirecting...')
        setSnackbarOpen(true)
        setTimeout(() => navigate('/dashboard'), 1000)
        return
      }

      if (isSignUp) {
        // Real Supabase User Registration
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setErrorMessage(error.message)
        } else {
          // If auto-confirm is enabled, session is active immediately
          if (data?.session) {
            localStorage.setItem('stocksage_token', data.session.access_token)
            localStorage.setItem('stocksage_user', JSON.stringify(data.user))
            setSuccessNotification('Account created successfully! Redirecting to research dashboard...')
            setSnackbarOpen(true)
            setTimeout(() => navigate('/dashboard'), 1400)
          } else {
            // User created in database
            setSuccessNotification('Account created in Supabase database! You can now sign in.')
            setSnackbarOpen(true)
            setIsSignUp(false)
            setPassword('')
          }
        }
      } else {
        // Real Supabase User Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setErrorMessage(error.message)
        } else {
          if (data?.session) {
            localStorage.setItem('stocksage_token', data.session.access_token)
            localStorage.setItem('stocksage_user', JSON.stringify(data.user))
          }
          setSuccessNotification('Login successful! Redirecting...')
          setSnackbarOpen(true)
          setTimeout(() => navigate('/dashboard'), 1000)
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.')
    } finally {
      setLoading(false)
    }
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
      {/* Toast Notification (Snackbar) */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          sx={{
            width: '100%',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {successNotification}
        </Alert>
      </Snackbar>

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
                ? 'Sign up with email and password to access research reports'
                : 'Sign in to access your research reports and watchlists'}
            </Typography>
          </Box>

          {/* Inline Error Alert */}
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }} onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          )}

          {/* Inline Success Alert */}
          {successNotification && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: '8px' }}>
              {successNotification}
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
              disabled={loading}
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
              disabled={loading}
              helperText={isSignUp ? 'Minimum 6 characters' : ''}
              sx={{ mb: 2.5 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.4,
                fontSize: '0.95rem',
                borderRadius: '8px',
                mb: 2,
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
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
                  setErrorMessage('')
                  setSuccessNotification('')
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



