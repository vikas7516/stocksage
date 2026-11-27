import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import NewspaperIcon from '@mui/icons-material/Newspaper'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { API_URL } from '../lib/api'

const AGENT_CONFIG = {
  fundamental: {
    label: 'Fundamental',
    fullTitle: 'Fundamental Analysis',
    color: '#1a56db',
    softBg: '#eff6ff',
    icon: <AssessmentOutlinedIcon sx={{ fontSize: 17 }} />,
    prompts: ['Is this valuation cheap or expensive?', 'How healthy is the debt & cash flow?'],
  },
  technical: {
    label: 'Technical',
    fullTitle: 'Technical Analysis',
    color: '#7c3aed',
    softBg: '#f5f3ff',
    icon: <ShowChartIcon sx={{ fontSize: 17 }} />,
    prompts: ['What key support levels should I watch?', 'Is momentum strengthening or fading?'],
  },
  news: {
    label: 'News',
    fullTitle: 'News & Sentiment',
    color: '#059669',
    softBg: '#ecfdf5',
    icon: <NewspaperIcon sx={{ fontSize: 17 }} />,
    prompts: ['What is driving recent sentiment?', 'Are there any conflicting news reports?'],
  },
  risk: {
    label: 'Risk',
    fullTitle: 'Risk Assessment',
    color: '#d97706',
    softBg: '#fffbeb',
    icon: <ShieldOutlinedIcon sx={{ fontSize: 17 }} />,
    prompts: ['What is the biggest downside risk?', 'Where do technicals and fundamentals disagree?'],
  },
}

const AGENT_KEYS = ['fundamental', 'technical', 'news', 'risk']

export default function AgentChatSidebar({ symbol, researchData, loading }) {
  const [activeAgent, setActiveAgent] = useState('fundamental')
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatsByAgent, setChatsByAgent] = useState({
    fundamental: [],
    technical: [],
    news: [],
    risk: [],
  })
  const chatEndRef = useRef(null)

  useEffect(() => {
    setChatsByAgent({ fundamental: [], technical: [], news: [], risk: [] })
  }, [symbol])

  const agents = researchData?.agents
  const cfg = AGENT_CONFIG[activeAgent]
  const currentData = agents?.[activeAgent]
  const agentChats = chatsByAgent[activeAgent] || []

  useEffect(() => {
    if (agentChats.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [agentChats.length, activeAgent])

  const getStatusBadge = () => {
    if (!currentData) return null
    if (activeAgent === 'fundamental') {
      return `${(currentData.valuation_assessment || '').replace('_', ' ').toUpperCase()} · ${(currentData.financial_health || '').toUpperCase()}`
    }
    if (activeAgent === 'technical') {
      return (currentData.trend_direction || '').replace('_', ' ').toUpperCase()
    }
    if (activeAgent === 'news') {
      return `${(currentData.overall_sentiment || '').toUpperCase()} SENTIMENT`
    }
    return `${currentData.risk_level || 'N/A'} RISK`
  }

  const getBullets = () => {
    if (!currentData) return []
    if (activeAgent === 'fundamental') return currentData.key_highlights || []
    if (activeAgent === 'technical') return currentData.key_observations || []
    if (activeAgent === 'news') {
      return (currentData.articles || [])
        .slice(0, 4)
        .map((a) => `[${a.sentiment.toUpperCase()}] ${a.takeaway || a.title}`)
    }
    return currentData.alternative_scenarios || []
  }

  const getWarnings = () => {
    if (!currentData) return []
    if (activeAgent === 'fundamental') return currentData.data_gaps || []
    if (activeAgent === 'technical') return currentData.disclaimer ? [currentData.disclaimer] : []
    if (activeAgent === 'news') return currentData.conflicting_reports || []
    return [...(currentData.conflicting_findings || []), ...(currentData.limitations || [])]
  }

  const sendQuestion = async (questionText) => {
    const q = (questionText ?? chatInput).trim()
    if (!q || sending) return

    const targetAgent = activeAgent
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: q }
    setChatsByAgent((prev) => ({
      ...prev,
      [targetAgent]: [...(prev[targetAgent] || []), userMsg],
    }))
    if (questionText === undefined) setChatInput('')
    setSending(true)

    try {
      const compactContext = researchData
        ? {
            symbol: researchData.resolved?.yfinance_symbol,
            technical_indicators: researchData.technical?.indicators,
            technical_signals: researchData.technical?.signals,
            fundamentals: researchData.fundamentals,
            risk: researchData.risk,
            agent_summary: agents?.[targetAgent]?.summary,
          }
        : {}

      const res = await fetch(`${API_URL}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          question: q,
          agent_focus: targetAgent,
          context: compactContext,
          history: (chatsByAgent[targetAgent] || []).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()
      setChatsByAgent((prev) => ({
        ...prev,
        [targetAgent]: [
          ...(prev[targetAgent] || []),
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.reply || 'No response received.',
            latencyMs: data.latency_ms || 0,
          },
        ],
      }))
    } catch (err) {
      setChatsByAgent((prev) => ({
        ...prev,
        [targetAgent]: [
          ...(prev[targetAgent] || []),
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: `Could not reach backend chat endpoint: ${err.message}`,
          },
        ],
      }))
    } finally {
      setSending(false)
    }
  }

  const takeawayText = currentData?.investor_takeaway || currentData?.advisory_stance
  const bullets = getBullets()
  const warnings = getWarnings()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header + 4 Focused Tabs (No "All" clutter) */}
      <Box sx={{ px: 3, pt: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SmartToyOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Research Agents
            </Typography>
          </Stack>
          <Chip
            label={agents?.model || 'gemini-3.1-flash-lite'}
            size="small"
            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, bgcolor: '#eff6ff', color: '#1a56db' }}
          />
        </Stack>

        <Tabs
          value={activeAgent}
          onChange={(_, val) => setActiveAgent(val)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              px: 1,
            },
          }}
        >
          {AGENT_KEYS.map((key) => (
            <Tab
              key={key}
              value={key}
              label={AGENT_CONFIG[key].label}
              icon={AGENT_CONFIG[key].icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Focused Single-Agent Report & Chat Stream */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {loading ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <CircularProgress size={30} sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              4 agents analyzing {symbol.toUpperCase()} in parallel...
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              Fundamental · Technical · News & Sentiment · Risk
            </Typography>
          </Box>
        ) : !currentData ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 6 }}>
            Select an NSE stock to view its agent analysis.
          </Typography>
        ) : (
          <Box>
            {/* Agent Status Banner */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, color: cfg.color }}>
                {cfg.fullTitle}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={getStatusBadge()}
                  size="small"
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: cfg.softBg, color: cfg.color }}
                />
                {currentData.execution_time_ms > 0 && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                    {(currentData.execution_time_ms / 1000).toFixed(1)}s
                  </Typography>
                )}
              </Stack>
            </Stack>

            {/* Primary Analytical Narrative */}
            <Typography
              variant="body1"
              sx={{
                color: 'text.primary',
                fontSize: '0.91rem',
                lineHeight: 1.75,
                mb: 2.5,
                whiteSpace: 'pre-line',
              }}
            >
              {currentData.summary}
            </Typography>

            {/* Highlighted Investor Takeaway / Advisory Stance */}
            {takeawayText && (
              <Box
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: '10px',
                  bgcolor: cfg.softBg,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ display: 'block', fontWeight: 800, color: cfg.color, letterSpacing: '0.05em', mb: 0.5 }}
                >
                  KEY TAKEAWAY
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.86rem', lineHeight: 1.6, fontWeight: 500 }}>
                  {takeawayText}
                </Typography>
              </Box>
            )}

            {/* Key Findings / Scenarios */}
            {bullets.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em', mb: 1 }}
                >
                  {activeAgent === 'risk' ? 'SCENARIOS TO WATCH' : 'KEY POINTS'}
                </Typography>
                <Stack spacing={0.9}>
                  {bullets.map((b, idx) => (
                    <Typography
                      key={idx}
                      variant="body2"
                      sx={{ color: 'text.secondary', fontSize: '0.84rem', lineHeight: 1.55, pl: 1.2, borderLeft: '2px solid #e2e8f0' }}
                    >
                      {b}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Conflicts / Data Gaps / Caveats */}
            {warnings.length > 0 && (
              <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', mb: 2 }}>
                {warnings.map((w, idx) => (
                  <Typography key={idx} variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.5, lineHeight: 1.5, fontSize: '0.77rem' }}>
                    • {w}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Follow-up Q&A for this Agent */}
            {agentChats.length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>
                  FOLLOW-UP Q&A ({cfg.label.toUpperCase()})
                </Typography>
                <Stack spacing={1.5}>
                  {agentChats.map((msg) =>
                    msg.role === 'user' ? (
                      <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Paper
                          elevation={0}
                          sx={{
                            px: 2,
                            py: 1,
                            maxWidth: '85%',
                            borderRadius: '14px 14px 4px 14px',
                            background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)',
                            color: '#ffffff',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontSize: '0.84rem' }}>
                            {msg.content}
                          </Typography>
                        </Paper>
                      </Box>
                    ) : (
                      <Box
                        key={msg.id}
                        sx={{
                          p: 1.6,
                          borderRadius: '10px',
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                          {msg.content}
                        </Typography>
                      </Box>
                    )
                  )}
                </Stack>
              </Box>
            )}

            {sending && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {cfg.label} Agent is thinking...
                </Typography>
              </Box>
            )}
            <div ref={chatEndRef} />
          </Box>
        )}
      </Box>

      <Divider />

      {/* Bottom Follow-up Input */}
      <Box sx={{ p: 2, backgroundColor: '#f8fafc' }}>
        <Stack direction="row" spacing={0.8} sx={{ mb: 1.2, overflowX: 'auto', pb: 0.2 }}>
          {cfg.prompts.map((qp) => (
            <Chip
              key={qp}
              label={qp}
              size="small"
              clickable
              disabled={loading || sending}
              onClick={() => sendQuestion(qp)}
              sx={{
                fontSize: '0.72rem',
                height: 24,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder={`Ask ${cfg.label} Agent about ${symbol.toUpperCase()}...`}
          value={chatInput}
          disabled={loading || sending}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendQuestion()
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  color="primary"
                  disabled={!chatInput.trim() || loading || sending}
                  onClick={() => sendQuestion()}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  )
}
