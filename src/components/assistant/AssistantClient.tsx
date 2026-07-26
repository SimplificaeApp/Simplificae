'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Bot, Send, Mic, MicOff, Loader2, Sparkles, User,
  AlertTriangle, Lightbulb, CheckCircle2, RotateCcw,
  TrendingUp, TrendingDown, Zap, Brain, ExternalLink
} from 'lucide-react'
import type { FinancialInsight } from '@/app/actions/insights'
import type { UIMessage } from 'ai'

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
// Message Bubble
// ──────────────────────────────────────────────
function MessageBubble({ message, isLast }: { message: UIMessage; isLast?: boolean }) {
  const isUser = message.role === 'user'

  const textParts = message.parts.filter((p: any) => p.type === 'text')
  const toolParts = message.parts.filter((p: any) => p.type === 'tool-invocation')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 self-end mb-1 ${
        isUser
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200'
          : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`max-w-[78%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {toolParts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-600 font-semibold"
          >
            <Brain className="w-3.5 h-3.5 animate-pulse" />
            Consultando seus dados financeiros...
          </motion.div>
        )}
        {textParts.map((part: any, i: number) => (
          <div
            key={i}
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-sm shadow-md shadow-emerald-200'
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'
            }`}
          >
            {part.text}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export function AssistantClient({ insights }: { insights: FinancialInsight[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

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
      <div className="xl:w-[360px] shrink-0 flex flex-col gap-4">

        {/* AI Header Card */}
        <div className="relative rounded-3xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 50%, #7c3aed 100%)'
        }}>
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 rounded-full bg-white" />
            <div className="absolute bottom-[-30px] left-[20px] w-32 h-32 rounded-full bg-white" />
          </div>

          <div className="relative p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                  <Bot className="w-5.5 h-5.5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-black text-white text-lg tracking-tight">FinanceOS AI</h2>
                  <p className="text-white/60 text-xs">Gemini Flash · Powered by Google</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                <span className="text-white/90 text-xs font-semibold">Online</span>
              </div>
            </div>

            <p className="text-white/75 text-sm leading-relaxed">
              Acesso completo ao seu histórico. Pergunte, analise e descubra padrões escondidos nas suas finanças.
            </p>

            <div className="flex gap-2 mt-4">
              {[
                { icon: '🧠', label: 'IA Real' },
                { icon: '📊', label: 'Dados Reais' },
                { icon: '⚡', label: 'Tempo Real' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-lg">
                  <span className="text-xs">{icon}</span>
                  <span className="text-white/80 text-[11px] font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Radar de Insights</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">Hoje</span>
          </div>

          {insights.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Analisando seus dados...</p>
              <p className="text-xs text-slate-400 mt-1">A IA está processando seu histórico</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" strokeWidth={2} />
            <h3 className="font-bold text-slate-700 text-sm">Perguntas rápidas</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {SUGGESTED_PROMPTS.map(({ text, icon }) => (
              <button
                key={text}
                onClick={() => { setInputText(text); inputRef.current?.focus() }}
                className="flex items-center gap-3 text-left text-xs font-medium text-slate-600 hover:text-violet-700 bg-white hover:bg-violet-50 border border-slate-100 hover:border-violet-200 px-3 py-2.5 rounded-xl transition-all group"
              >
                <span className="text-sm shrink-0 group-hover:scale-110 transition-transform">{icon}</span>
                <span className="leading-snug">{text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: CHAT ─── */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[520px] xl:min-h-0">

        {/* Chat header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Chat IA</p>
              <p className="text-[10px] text-slate-400 font-medium">Responde com base nos seus dados reais</p>
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
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center gap-5 py-10"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-300">
                  <Bot className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center"
                >
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </motion.div>
              </div>

              <div>
                <h3 className="font-black text-slate-800 text-xl">Olá! Como posso ajudar?</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
                  Tenho acesso a todo o seu histórico financeiro. Pergunte qualquer coisa e vou buscar nos seus dados reais.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {SUGGESTED_PROMPTS.slice(0, 2).map(({ text, icon }) => (
                  <button
                    key={text}
                    onClick={() => { setInputText(text); inputRef.current?.focus() }}
                    className="flex items-start gap-2 text-left p-3 bg-white border border-slate-200 rounded-2xl hover:border-violet-300 hover:bg-violet-50 transition-all text-xs font-medium text-slate-600 hover:text-violet-700"
                  >
                    <span className="text-base shrink-0">{icon}</span>
                    <span className="leading-snug">{text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((m, i) => (
                <MessageBubble key={m.id} message={m} isLast={i === messages.length - 1} />
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
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100/50 transition-all">
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
              className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none py-1"
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || !inputText.trim()}
              className={`p-2 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                isLoading || !inputText.trim()
                  ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 shadow-md shadow-violet-200'
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
    </div>
  )
}
