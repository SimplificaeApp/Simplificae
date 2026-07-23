'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '../actions'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'

type State = { error?: string; success?: string }
const initialState: State = {}

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40"
    >
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4 text-emerald-600 shadow-sm"
        >
          <KeyRound className="w-8 h-8" />
        </motion.div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
          Esqueceu sua senha?
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Digite seu e-mail abaixo. Enviaremos um link seguro para redefinir sua senha.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {state?.error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl font-medium"
          >
            {state.error}
          </motion.div>
        )}

        {state?.success && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl font-semibold flex flex-col gap-1"
          >
            <span>✉️ {state.success}</span>
            <span className="text-xs font-normal text-emerald-600">Não se esqueça de checar a caixa de SPAM se não encontrar.</span>
          </motion.div>
        )}

        <div className="group">
          <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="email">
            Seu E-mail Cadastrado
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200 select-text"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={pending}
          className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando e-mail...
            </>
          ) : (
            <>
              Enviar Link de Recuperação
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-8 text-center text-sm font-medium text-slate-500">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Login
        </Link>
      </div>
    </motion.div>
  )
}
