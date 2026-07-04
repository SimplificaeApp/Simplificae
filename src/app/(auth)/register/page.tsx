'use client'

import { useActionState } from 'react'
import { signup } from '../actions'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

type State = { error?: string; success?: string }
const initialState: State = {}

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signup, initialState)

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
          className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4 text-blue-600 shadow-sm"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </motion.div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
          Criar Conta
        </h1>
        <p className="text-sm text-slate-500 font-medium">Junte-se ao FinanceOS e transforme suas finanças.</p>
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl text-center font-bold shadow-sm"
          >
            <div className="text-2xl mb-2">✅</div>
            {state.success}
          </motion.div>
        )}

        {!state?.success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-5"
          >
            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-blue-600" htmlFor="first_name">
                Seu Nome
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                placeholder="Como quer ser chamado?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 select-text"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-blue-600" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 select-text"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-blue-600" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 select-text"
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
                  Criando conta...
                </>
              ) : (
                <>
                  Criar minha conta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </form>

      <div className="mt-8 text-center text-sm font-medium text-slate-500">
        Já possui conta?{' '}
        <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
          Faça login
        </Link>
      </div>
    </motion.div>
  )
}
