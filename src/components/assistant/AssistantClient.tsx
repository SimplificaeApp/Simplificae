'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bot, Send, Mic, MicOff, Loader2, Sparkles, User,
  AlertTriangle, Lightbulb, CheckCircle2, RotateCcw,
  TrendingUp, TrendingDown, Zap, Brain, ExternalLink
} from 'lucide-react'
import { getFinancialInsights } from '@/app/actions/insights'
import type { FinancialInsight } from '@/app/actions/insights'
import type { UIMessage } from 'ai'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'

// ──────────────────────────────────────────────
// Insight Card
// ──────────────────────────────────────────────
const INSIGHT_STYLES = {
  warning: {
    gradient: 'from-amber-500/10 to-orange-500/5',
    border: 'border-amber-200/60',
    glow: 'shadow-amber-100',
    icon: TrendingUp,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Atenção',
    dot: 'bg-amber-400',
  },
  success: {
    gradient: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-200/60',
    glow: 'shadow-emerald-100',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Ótimo!',
    dot: 'bg-emerald-400',
  },
  tip: {
    gradient: 'from-violet-500/10 to-indigo-500/5',
    border: 'border-violet-200/60',
    glow: 'shadow-violet-100',
    icon: Lightbulb,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
    label: 'Dica',
    dot: 'bg-violet-400',
  },
  alert: {
    gradient: 'from-rose-500/10 to-pink-500/5',
    border: 'border-rose-200/60',
    glow: 'shadow-rose-100',
    icon: TrendingDown,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-700',
    label: 'Alerta',
    dot: 'bg-rose-400',
  },
}

function InsightCard({ insight, index }: { insight: FinancialInsight; index: number }) {
  const style = INSIGHT_STYLES[insight.type]
  const Icon = style.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.45, ease: 'easeOut' }}
      className={`relative rounded-2xl border bg-gradient-to-br ${style.gradient} ${style.border} p-4 overflow-hidden shadow-sm ${style.glow}`}
    >
      {/* Subtle background pattern */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
        <Icon className="w-full h-full" />
      </div>

      <div className="flex items-start gap-3 relative">
        <div className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${style.iconColor}`} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}>
              {style.label}
            </span>
            {insight.metric && (
              <span className="text-xs font-bold text-slate-500">{insight.metric}</span>
            )}
          </div>
          <p className="font-bold text-slate-800 text-sm leading-snug">{insight.title}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// Suggested Prompts
// ──────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { text: 'Como foram meus gastos esse mês?', icon: '📊' },
  { text: 'Quanto gastei com alimentação nos últimos 3 meses?', icon: '🍕' },
  { text: 'Estou no caminho certo para fechar o mês no positivo?', icon: '🎯' },
  { text: 'Qual categoria mais consome meu dinheiro?', icon: '💸' },
]

// ──────────────────────────────────────────────
// Markdown renderer components (shared)
// ──────────────────────────────────────────────
const MD_COMPONENTS = {
  h1: ({node, ...props}: any) => <h1 className="text-[17px] font-black mt-4 mb-2 text-slate-900" {...props}/>,
  h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-4 mb-2 text-slate-800" {...props}/>,
  h3: ({node, ...props}: any) => <h3 className="text-[15px] font-bold mt-3 mb-1.5 text-slate-800" {...props}/>,
  p: ({node, ...props}: any) => <p className="mb-2.5 last:mb-0 leading-relaxed" {...props}/>,
  ul: ({node, ...props}: any) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5" {...props}/>,
  ol: ({node, ...props}: any) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5" {...props}/>,
  li: ({node, ...props}: any) => <li className="pl-1" {...props}/>,
  strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900" {...props}/>,
  em: ({node, ...props}: any) => <em className="italic text-slate-600" {...props}/>,
  hr: ({node, ...props}: any) => <hr className="my-4 border-slate-100" {...props}/>,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-violet-300 pl-3 my-3 text-slate-600 italic" {...props}/>,
  code: ({node, inline, ...props}: any) => inline
    ? <code className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}/>
    : <code className="block bg-slate-50 rounded-xl p-3 text-[13px] font-mono text-slate-700 my-2 overflow-x-auto" {...props}/>,
  table: ({node, ...props}: any) => <div className="overflow-x-auto my-3"><table className="w-full text-left border-collapse text-sm" {...props}/></div>,
  th: ({node, ...props}: any) => <th className="border-b border-slate-200 py-2 px-3 font-semibold text-slate-800 bg-slate-50" {...props}/>,
  td: ({node, ...props}: any) => <td className="border-b border-slate-100 py-2 px-3" {...props}/>,
}

// ──────────────────────────────────────────────
// Data Card — shown below the AI text
// ──────────────────────────────────────────────
function DataCard({ data }: { data: any }) {
  const fmtBRL = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const isCategoryCard = data.categoryQuery !== undefined
  const isSummaryCard = data.totalIncome !== undefined || data.totalExpense !== undefined
  const isSearchCard = data.query !== undefined && data.transactions
  const isBudgetCard = data.monthProgress !== undefined && data.realExpense !== undefined
  const isUpcomingCard = data.daysAhead !== undefined

  // Respect server-side showCard flag
  if (data.showCard === false) return null
  if (!data.found && !isBudgetCard) return null

  const cardIcon = isCategoryCard ? '🏷️' : isSummaryCard ? '📊' : isSearchCard ? '🔍' : isUpcomingCard ? '📆' : '📅'
  const cardLabel = isCategoryCard ? 'Gastos por Categoria' : isSummaryCard ? 'Resumo do Período' : isSearchCard ? 'Busca de Transações' : isUpcomingCard ? 'Próximas Contas' : 'Status do Mês'

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 rounded-2xl p-4 shadow-sm w-full max-w-sm mt-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-[13px]">
            {cardIcon}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {cardLabel}

          </p>
          <p className="text-xs font-semibold text-slate-600">
            {data.period || data.categoryQuery || data.query || ''}
          </p>
        </div>
      </div>

      {/* Main numbers */}
      {isSummaryCard && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-emerald-50 border border-emerald-100/80 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Receitas</p>
            <p className="text-sm font-black text-emerald-700">{fmtBRL(data.totalIncome ?? 0)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100/80 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-0.5">Despesas</p>
            <p className="text-sm font-black text-rose-700">{fmtBRL(data.totalExpense ?? 0)}</p>
          </div>
          {data.balance !== undefined && (
            <div className={`col-span-2 p-3 rounded-xl border flex justify-between items-center ${parseFloat(String(data.balance)) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <span className="text-xs font-semibold text-slate-500">Saldo do Período</span>
              <span className={`text-sm font-black ${parseFloat(String(data.balance)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmtBRL(data.balance)}
              </span>
            </div>
          )}
        </div>
      )}

      {isCategoryCard && data.totalSpent !== undefined && (
        <div className="bg-rose-50 border border-rose-100/80 p-3 rounded-xl mb-3">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-0.5">Total Gasto</p>
          <p className="text-lg font-black text-rose-700">{fmtBRL(data.totalSpent)}</p>
          <p className="text-[11px] text-rose-400 mt-0.5">{data.transactionCount} lançamento{data.transactionCount !== 1 ? 's' : ''}</p>
        </div>
      )}

      {isSearchCard && data.totalSpent !== undefined && (
        <div className="bg-violet-50 border border-violet-100/80 p-3 rounded-xl mb-3">
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide mb-0.5">Total Encontrado</p>
          <p className="text-lg font-black text-violet-700">{fmtBRL(data.totalSpent)}</p>
          <p className="text-[11px] text-violet-400 mt-0.5">{data.transactionCount} ocorrência{data.transactionCount !== 1 ? 's' : ''} em {data.months} mês{data.months !== 1 ? 'es' : ''}</p>
        </div>
      )}

      {isBudgetCard && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-emerald-50 border border-emerald-100/80 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Receitas</p>
            <p className="text-sm font-black text-emerald-700">{fmtBRL(data.realIncome ?? 0)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100/80 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-0.5">Despesas</p>
            <p className="text-sm font-black text-rose-700">{fmtBRL(data.realExpense ?? 0)}</p>
          </div>
          {data.pendingExpense > 0 && (
            <div className="col-span-2 bg-amber-50 border border-amber-100/80 p-3 rounded-xl flex justify-between items-center">
              <span className="text-xs font-semibold text-amber-600">⏳ Pendente</span>
              <span className="text-sm font-black text-amber-700">{fmtBRL(data.pendingExpense)}</span>
            </div>
          )}
        </div>
      )}

      {/* Top categories */}
      {data.topCategories && data.topCategories.length > 0 && (
        <div className="mt-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Principais Categorias</p>
          <div className="flex flex-col gap-1">
            {data.topCategories.map((cat: any, idx: number) => {
              const topVal = data.topCategories[0]?.total || 1
              const pct = Math.round((cat.total / topVal) * 100)
              return (
                <div key={idx} className="relative">
                  <div className="absolute inset-0 bg-violet-50 rounded-lg" style={{ width: `${pct}%`, opacity: 0.6 }} />
                  <div className="relative flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg">
                    <span className="text-slate-600 font-medium">{cat.name}</span>
                    <span className="font-bold text-slate-800 ml-2">{fmtBRL(cat.total)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transactions list */}
      {data.transactions && data.transactions.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lançamentos</p>
          <div className="flex flex-col gap-1">
            {data.transactions.map((tx: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 bg-slate-50 rounded-lg gap-2">
                <div className="min-w-0">
                  <span className="text-slate-700 font-medium truncate block max-w-[160px]">{tx.description || tx.category || '—'}</span>
                  {tx.date && <span className="text-slate-400 text-[10px]">{new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>}
                </div>
                <span className={`font-bold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : ''}{fmtBRL(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Message Bubble
// ──────────────────────────────────────────────
function MessageBubble({ message, isLast, isLoading }: { message: UIMessage; isLast?: boolean; isLoading?: boolean }) {
  const isUser = message.role === 'user'
  const isThisBubbleLoading = !!(isLast && isLoading)

  // Collect all text parts
  const parts = message.parts || []
  const textParts = parts.filter((p: any) => p.type === 'text' && (p.text || p.textDelta)) as any[]
  const allText = textParts.map((p: any) => p.text || p.textDelta || '').join('')

  // Fallback to message.content if no text parts
  const contentText = allText || (typeof (message as any).content === 'string' ? (message as any).content : '') || ''

  // Tool invocation parts — AI SDK v4 uses type 'tool-invocation'
  const toolParts = parts.filter((p: any) =>
    p.type === 'tool-invocation' || p.toolCallId || p.type?.startsWith('tool-')
  ) as any[]

  const isExecutingTool = isThisBubbleLoading && toolParts.some((p: any) => {
    const inv = p.toolInvocation || p
    const state = inv.state || p.state
    return state === 'call' || state === 'partial-call' || state === 'input-streaming'
  })

  // Find any completed tool result
  const completedToolPart = toolParts.find((p: any) => {
    const inv = p.toolInvocation || p
    const state = inv.state || p.state
    return state === 'result' || state === 'output-available' || inv.result !== undefined || p.output !== undefined
  })
  const toolOutput = completedToolPart
    ? (completedToolPart.toolInvocation?.result ?? completedToolPart.result ?? completedToolPart.output ?? null)
    : null

  // The AI insight text — either from model text stream OR from tool's insight field (server-generated)
  const insightText = contentText.trim() || (toolOutput?.insight as string) || ''
  const isLoadingInsight = isThisBubbleLoading && toolOutput && !insightText && !isExecutingTool

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar — AI only */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 self-end mb-1 bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Consulting indicator */}
        {isExecutingTool && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3.5 py-2 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-600 font-semibold"
          >
            <Brain className="w-3.5 h-3.5 animate-pulse text-violet-500" />
            Consultando seus dados financeiros...
          </motion.div>
        )}

        {/* Loading: tool done but insight not yet received */}
        {isLoadingInsight && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
            Gerando análise com base nos dados...
          </div>
        )}

        {/* Text content — model stream OR server-generated insight */}
        {insightText && (
          <div
            className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
              isUser
                ? 'bg-slate-800 text-white rounded-br-sm shadow-md shadow-slate-200'
                : 'bg-white border border-slate-100/80 text-slate-700 rounded-bl-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)]'
            }`}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{insightText}</span>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                {insightText}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Data Card — visual summary below the text */}
        {toolOutput && <DataCard data={toolOutput} />}
      </div>
    </motion.div>
  )
}



// ──────────────────────────────────────────────
// Main Component

// ──────────────────────────────────────────────
export function AssistantClient() {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const [insights, setInsights] = useState<FinancialInsight[]>([])
  const [isInsightsLoading, setIsInsightsLoading] = useState(false)
  const [isMobileInsightsOpen, setIsMobileInsightsOpen] = useState(false)

  const handleGenerateInsights = async () => {
    setIsInsightsLoading(true)
    try {
      const data = await getFinancialInsights(true)
      setInsights(data || [])
    } catch (err) {
      console.error('Error fetching insights:', err)
      toast.error('Erro ao buscar insights.')
    } finally {
      setIsInsightsLoading(false)
    }
  }


  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    maxSteps: 5,
  } as any)

  useEffect(() => {
    console.log('[CLIENT ASSISTANT] Status:', status, 'Messages count:', messages.length, 'Latest message:', messages[messages.length - 1])
  }, [messages, status])

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (error) {
      const msg = error.message.includes('An error occurred') 
        ? 'Limite de uso da IA atingido (Google Gemini Free). Aguarde 1 minuto e tente novamente.' 
        : error.message;
      toast.error('Erro na IA: ' + msg.substring(0, 150))
    }
  }, [error])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    if (!inputText.trim() || isLoading) return
    sendMessage({ text: inputText })
    setInputText('')
  }

  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Seu navegador não suporta voz.'); return }
    const r = new SR()
    r.lang = 'pt-BR'
    r.onstart = () => setIsListening(true)
    r.onend = () => setIsListening(false)
    r.onresult = (e: any) => {
      setInputText(e.results[0][0].transcript)
      inputRef.current?.focus()
    }
    r.start()
  }

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-full min-h-0">

      {/* ─── LEFT COLUMN ─── */}
      <div className="hidden xl:flex xl:w-[360px] shrink-0 flex-col gap-4">

        {/* Insights */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-200">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Radar de Insights</h3>
            </div>
            <div className="flex items-center gap-2">
              {insights.length > 0 && (
                <button 
                  onClick={handleGenerateInsights}
                  disabled={isInsightsLoading}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-violet-600"
                  title="Atualizar insights"
                >
                  <Loader2 className={`w-3.5 h-3.5 ${isInsightsLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">Hoje</span>
            </div>
          </div>

          {isInsightsLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Analisando seus dados...</p>
              <p className="text-xs text-slate-400 mt-1">A IA está processando seu histórico</p>
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500 mb-2">Seu radar está inativo</p>
              <p className="text-xs text-slate-400 mb-4 px-2">Descubra dicas e alertas sobre suas finanças com IA.</p>
              <button
                onClick={handleGenerateInsights}
                className="bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Ativar Radar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ─── RIGHT COLUMN: CHAT ─── */}
      <div className="relative flex-1 min-w-0 flex flex-col bg-white md:rounded-3xl border-0 md:border border-slate-100 shadow-sm overflow-hidden h-full min-h-0">

        {/* Chat header (Desktop Only) */}
        <div className="hidden md:flex px-5 py-4 border-b border-slate-100 items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">Chat IA</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Responde com base nos seus dados</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar
              </button>
            )}
            <button
              onClick={() => setIsMobileInsightsOpen(true)}
              className="xl:hidden flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Insights
            </button>
          </div>
        </div>

        {/* Mobile Floating Actions */}
        <div className="md:hidden absolute top-4 right-4 z-10 flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-white/80 backdrop-blur shadow-sm border border-slate-200/60 px-2.5 py-1.5 rounded-full transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setIsMobileInsightsOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 hover:text-violet-700 bg-white/80 backdrop-blur shadow-sm border border-violet-100 px-2.5 py-1.5 rounded-full transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Insights
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center gap-8 py-10"
            >
              <div className="mt-auto">
                <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 text-3xl mb-2 tracking-tight">FinanceOS AI</h3>
                <p className="text-slate-500 font-medium">No que posso ajudar você hoje?</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 w-full max-w-lg mx-auto mt-auto mb-4">
                {SUGGESTED_PROMPTS.slice(0, 4).map(({ text, icon }) => (
                  <button
                    key={text}
                    onClick={() => { sendMessage({ text }) }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 rounded-full hover:border-violet-300 hover:bg-violet-50 transition-all text-[13px] font-medium text-slate-600 hover:text-violet-700 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
                  >
                    <span className="shrink-0">{icon}</span>
                    <span className="truncate max-w-[200px]">{text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((m, i) => (
                <MessageBubble key={m.id} message={m} isLast={i === messages.length - 1} isLoading={isLoading} />
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-200">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 150, 300].map(delay => (
                        <motion.span
                          key={delay}
                          className="w-2 h-2 bg-violet-400 rounded-full block"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 bg-transparent shrink-0 relative z-20">
          <div className="flex gap-2 items-center bg-white/80 backdrop-blur-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-full px-2.5 py-2 md:focus-within:border-violet-300 md:focus-within:ring-4 focus-within:ring-violet-100/50 transition-all max-w-4xl mx-auto w-full">
            <button
              onClick={handleVoice}
              className={`p-2 rounded-xl transition-all shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
              }`}
              title={isListening ? 'Gravando...' : 'Falar'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Pergunte qualquer coisa sobre suas finanças..."
              className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none py-1.5 px-2"
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || !inputText.trim()}
              className={`p-2 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                isListening || !inputText.trim() || isLoading
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200 hover:scale-105'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
            FinanceOS AI pode cometer erros. Confira valores importantes nos relatórios.
          </p>
        </div>
      </div>

      {/* Modal de Insights no Mobile */}
      <Modal
        isOpen={isMobileInsightsOpen}
        onClose={() => setIsMobileInsightsOpen(false)}
        title="Radar de Insights"
      >
        <div className="p-1 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-500 font-medium">Análise gerada por Inteligência Artificial</p>
            <div className="flex items-center gap-2">
              {insights.length > 0 && (
                <button 
                  onClick={handleGenerateInsights}
                  disabled={isInsightsLoading}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-violet-600"
                  title="Atualizar insights"
                >
                  <Loader2 className={`w-3.5 h-3.5 ${isInsightsLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">Hoje</span>
            </div>
          </div>

          {isInsightsLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Analisando seus dados...</p>
              <p className="text-xs text-slate-400 mt-1">A IA está processando seu histórico</p>
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500 mb-2">Seu radar está inativo</p>
              <p className="text-xs text-slate-400 mb-4 px-2">Descubra dicas e alertas sobre suas finanças com IA.</p>
              <button
                onClick={handleGenerateInsights}
                className="bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Ativar Radar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          )}
        </div>
      </Modal>

    </div>
  )
}
