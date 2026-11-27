import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
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
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import NewspaperIcon from '@mui/icons-material/Newspaper'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { API_URL } from '../lib/api'

const AGENT_CONFIG = {
  fundamental: {
    label: 'Fundamental',
    icon: <AssessmentOutlinedIcon sx={{ fontSize: 16 }} />,
    prompts: ['Is valuation cheap or expensive?', 'How safe is debt & cash flow?'],
  },
  technical: {
    label: 'Technical',
    icon: <ShowChartIcon sx={{ fontSize: 16 }} />,
    prompts: ['What key support levels matter?', 'Is momentum strengthening or fading?'],
  },
  news: {
    label: 'News',
    icon: <NewspaperIcon sx={{ fontSize: 16 }} />,
    prompts: ['What is driving news sentiment?', 'Any conflicting headlines?'],
  },
  risk: {
    label: 'Risk',
    icon: <ShieldOutlinedIcon sx={{ fontSize: 16 }} />,
    prompts: ['What is the biggest downside risk?', 'Any conflicts across signals?'],
  },
}

const AGENT_KEYS = ['fundamental', 'technical', 'news', 'risk']

const markdownSx = {
  color: 'text.primary',
  fontSize: '0.88rem',
  lineHeight: 1.65,
  '& h1, & h2, & h3, & h4': {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontWeight: 700,
    color: '#0f172a',
    fontSize: '0.92rem',
    mt: 2.2,
    mb: 0.75,
    '&:first-of-type': { mt: 0 },
  },
  '& p': {
    mt: 0,
    mb: 1.25,
    color: '#334155',
  },
  '& ul, & ol': {
    pl: 2.2,
    mt: 0,
    mb: 1.5,
  },
  '& li': {
    mb: 0.65,
    color: '#334155',
  },
  '& strong': {
    color: '#0f172a',
    fontWeight: 600,
  },
  '& a': {
    color: '#1a56db',
    textDecoration: 'none',
    fontWeight: 500,
    '&:hover': { textDecoration: 'underline' },
  },
  '& code': {
    bgcolor: '#f1f5f9',
    px: 0.6,
    py: 0.15,
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
}

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
      let domainContext = { symbol: researchData?.resolved?.yfinance_symbol }
      if (researchData) {
        if (targetAgent === 'fundamental') {
          domainContext = {
            ...domainContext,
            fundamentals: researchData.fundamentals,
            agent_report: agents?.fundamental?.report_markdown || agents?.fundamental?.summary,
          }
        } else if (targetAgent === 'technical') {
          domainContext = {
            ...domainContext,
            latest_price: researchData.technical?.latest_price,
            period_return_pct: researchData.technical?.period_return_pct,
            indicators: researchData.technical?.indicators,
            signals: researchData.technical?.signals,
            agent_report: agents?.technical?.report_markdown || agents?.technical?.summary,
          }
        } else if (targetAgent === 'news') {
          domainContext = {
            ...domainContext,
            overall_sentiment: agents?.news?.overall_sentiment,
            articles: agents?.news?.articles || researchData.news || [],
            conflicting_reports: agents?.news?.conflicting_reports || [],
            agent_report: agents?.news?.report_markdown || agents?.news?.summary,
          }
        } else if (targetAgent === 'risk') {
          domainContext = {
            ...domainContext,
            risk: researchData.risk,
            conflicting_findings: agents?.risk?.conflicting_findings || [],
            limitations: agents?.risk?.limitations || [],
            agent_report: agents?.risk?.report_markdown || agents?.risk?.summary,
          }
        }
      }

      const res = await fetch(`${API_URL}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          question: q,
          agent_focus: targetAgent,
          context: domainContext,
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

  const markdownContent = currentData?.report_markdown || currentData?.summary || ''

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Clean 4-Tab Bar */}
      <Box sx={{ px: 2, pt: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeAgent}
          onChange={(_, val) => setActiveAgent(val)}
          variant="fullWidth"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
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

      {/* Pure Parsed Markdown Body + Chat */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {loading ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Analyzing {symbol.toUpperCase()}...
            </Typography>
          </Box>
        ) : !markdownContent ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 6 }}>
            Select an NSE stock to view its analysis.
          </Typography>
        ) : (
          <Box>
            <Box sx={markdownSx}>
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </Box>

            {agentChats.length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
                          ...markdownSx,
                          p: 1.75,
                          borderRadius: '10px',
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
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
