import { useEffect, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import NewspaperIcon from '@mui/icons-material/Newspaper'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

const AGENT_META = {
  fundamental: {
    label: 'Fundamental Agent',
    color: '#1a56db',
    bg: '#eff6ff',
    icon: <AssessmentOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  technical: {
    label: 'Technical Agent',
    color: '#7c3aed',
    bg: '#f5f3ff',
    icon: <ShowChartIcon sx={{ fontSize: 16 }} />,
  },
  news: {
    label: 'News & Sentiment Agent',
    color: '#059669',
    bg: '#ecfdf5',
    icon: <NewspaperIcon sx={{ fontSize: 16 }} />,
  },
  risk: {
    label: 'Risk Agent',
    color: '#d97706',
    bg: '#fffbeb',
    icon: <ShieldOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  all: {
    label: 'StockSage Agents',
    color: '#0f172a',
    bg: '#f1f5f9',
    icon: <SmartToyOutlinedIcon sx={{ fontSize: 16 }} />,
  },
}

const QUICK_PROMPTS = [
  'Any conflicting signals across agents?',
  'Is valuation cheap or expensive?',
  'Summarize top risk factors',
]

function AgentMessageCard({ msg }) {
  const [expanded, setExpanded] = useState(false)
  const meta = AGENT_META[msg.agent] || AGENT_META.all

  if (msg.role === 'user') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.2,
            maxWidth: '85%',
            borderRadius: '14px 14px 4px 14px',
            background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)',
            color: '#ffffff',
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
            {msg.content}
          </Typography>
        </Paper>
      </Box>
    )
  }

  const hasDetails = (msg.bullets && msg.bullets.length > 0) || (msg.warnings && msg.warnings.length > 0)

  return (
    <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
      <Avatar
        sx={{
          width: 30,
          height: 30,
          bgcolor: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.color}30`,
          mt: 0.3,
        }}
      >
        {meta.icon}
      </Avatar>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          p: 1.75,
          borderRadius: '4px 14px 14px 14px',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#ffffff',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color, fontSize: '0.76rem' }}>
            {meta.label}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {msg.badge && (
              <Chip
                label={msg.badge}
                size="small"
                sx={{
                  height: 19,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: meta.bg,
                  color: meta.color,
                }}
              />
            )}
            {msg.latencyMs > 0 && (
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.66rem' }}>
                {msg.latencyMs}ms
              </Typography>
            )}
          </Stack>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.835rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
          {msg.content}
        </Typography>

        {hasDetails && (
          <Box sx={{ mt: 1 }}>
            <Box
              onClick={() => setExpanded((v) => !v)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                cursor: 'pointer',
                color: 'primary.main',
                fontSize: '0.74rem',
                fontWeight: 600,
              }}
            >
              {expanded ? 'Hide details' : 'Show key points'}
              {expanded ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
            </Box>

            <Collapse in={expanded}>
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                {(msg.bullets || []).map((b, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4, lineHeight: 1.45 }}>
                    • {b}
                  </Typography>
                ))}
                {(msg.warnings || []).map((w, i) => (
                  <Typography key={`w-${i}`} variant="caption" sx={{ display: 'block', color: '#b45309', mt: 0.4, lineHeight: 1.45 }}>
                    ⚠ {w}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default function AgentChatSidebar({ symbol, researchData, loading }) {
  const [agentFilter, setAgentFilter] = useState('all')
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [followUps, setFollowUps] = useState([])
  const scrollBottomRef = useRef(null)

  // Reset follow-up chat when switching stocks
  useEffect(() => {
    setFollowUps([])
  }, [symbol])

  const agents = researchData?.agents

  const initialAgentMessages = agents
    ? [
        {
          id: 'fund-init',
          role: 'assistant',
          agent: 'fundamental',
          badge: `${agents.fundamental.valuation_assessment?.replace('_', ' ').toUpperCase()}`,
          content: agents.fundamental.summary,
          bullets: agents.fundamental.key_highlights,
          warnings: agents.fundamental.data_gaps,
          latencyMs: agents.fundamental.execution_time_ms,
        },
        {
          id: 'tech-init',
          role: 'assistant',
          agent: 'technical',
          badge: `${agents.technical.trend_direction?.replace('_', ' ').toUpperCase()}`,
          content: agents.technical.summary,
          bullets: agents.technical.key_observations,
          warnings: [agents.technical.disclaimer],
          latencyMs: agents.technical.execution_time_ms,
        },
        {
          id: 'news-init',
          role: 'assistant',
          agent: 'news',
          badge: `${agents.news.overall_sentiment?.toUpperCase()} SENTIMENT`,
          content: agents.news.summary,
          bullets: (agents.news.articles || []).slice(0, 3).map((a) => `[${a.sentiment.toUpperCase()}] ${a.takeaway || a.title}`),
          warnings: agents.news.conflicting_reports,
          latencyMs: agents.news.execution_time_ms,
        },
        {
          id: 'risk-init',
          role: 'assistant',
          agent: 'risk',
          badge: `${agents.risk.risk_level} RISK`,
          content: agents.risk.summary,
          bullets: agents.risk.alternative_scenarios,
          warnings: [...(agents.risk.conflicting_findings || []), ...(agents.risk.limitations || [])],
          latencyMs: agents.risk.execution_time_ms,
        },
      ]
    : []

  const allMessages = [...initialAgentMessages, ...followUps]
  const visibleMessages =
    agentFilter === 'all'
      ? allMessages
      : allMessages.filter((m) => m.role === 'user' || m.agent === agentFilter || m.agent === 'all')

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [followUps.length, agents?.model])

  const sendQuestion = async (questionText) => {
    const q = (questionText ?? chatInput).trim()
    if (!q || sending) return

    const userMsg = { id: `u-${Date.now()}`, role: 'user', agent: agentFilter, content: q }
    setFollowUps((prev) => [...prev, userMsg])
    if (questionText === undefined) setChatInput('')
    setSending(true)

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    try {
      const compactContext = researchData
        ? {
            symbol: researchData.resolved?.yfinance_symbol,
            technical_indicators: researchData.technical?.indicators,
            technical_signals: researchData.technical?.signals,
            fundamentals: researchData.fundamentals,
            risk: researchData.risk,
            agent_summaries: {
              fundamental: agents?.fundamental?.summary,
              technical: agents?.technical?.summary,
              news: agents?.news?.summary,
              risk: agents?.risk?.summary,
            },
          }
        : {}

      const res = await fetch(`${apiUrl}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          question: q,
          agent_focus: agentFilter,
          context: compactContext,
          history: followUps.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      setFollowUps((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          agent: data.agent || agentFilter,
          badge: data.model,
          content: data.reply || 'No response received.',
          latencyMs: data.latency_ms || 0,
        },
      ])
    } catch (err) {
      setFollowUps((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          agent: agentFilter,
          content: `Could not reach backend chat endpoint: ${err.message}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Sidebar Header */}
      <Box sx={{ px: 2.5, py: 2, backgroundColor: '#ffffff', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SmartToyOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.98rem' }}>
              Agent Research Chat
            </Typography>
          </Stack>
          <Chip
            label={agents?.model || 'qwen/qwen3.8-27b'}
            size="small"
            sx={{ height: 20, fontSize: '0.66rem', fontWeight: 600, bgcolor: '#eff6ff', color: '#1a56db' }}
          />
        </Stack>

        {/* Agent Filter Pills */}
        <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
          {[
            ['all', 'All (4)'],
            ['fundamental', 'Fundamental'],
            ['technical', 'Technical'],
            ['news', 'News'],
            ['risk', 'Risk'],
          ].map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              size="small"
              clickable
              onClick={() => setAgentFilter(key)}
              color={agentFilter === key ? 'primary' : 'default'}
              variant={agentFilter === key ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.7rem', height: 24, fontWeight: 600 }}
            />
          ))}
        </Stack>
      </Box>

      {/* Scrollable Chat Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ mb: 1.5 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Agents are independently analyzing {symbol.toUpperCase()}...
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
              Fundamental · Technical · News & Sentiment · Risk
            </Typography>
          </Box>
        ) : visibleMessages.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
            Search or select a stock to view structured agent explanations.
          </Typography>
        ) : (
          visibleMessages.map((msg) => <AgentMessageCard key={msg.id} msg={msg} />)
        )}

        {sending && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 5 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {AGENT_META[agentFilter]?.label || 'Agent'} is typing...
            </Typography>
          </Box>
        )}
        <div ref={scrollBottomRef} />
      </Box>

      <Divider />

      {/* Quick Prompts + Chat Input */}
      <Box sx={{ p: 2, backgroundColor: '#ffffff' }}>
        <Stack direction="row" spacing={0.6} sx={{ mb: 1.2, overflowX: 'auto', pb: 0.3 }}>
          {QUICK_PROMPTS.map((qp) => (
            <Chip
              key={qp}
              label={qp}
              size="small"
              clickable
              disabled={loading || sending}
              onClick={() => sendQuestion(qp)}
              sx={{
                fontSize: '0.7rem',
                height: 23,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder={`Ask ${agentFilter === 'all' ? 'the agents' : AGENT_META[agentFilter]?.label} about ${symbol.toUpperCase()}...`}
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
