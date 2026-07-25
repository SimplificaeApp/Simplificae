'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  id: string
  label: string
  icon?: string
  color?: string
  group?: string
}

interface CustomSelectProps {
  value: string
  onChange: (val: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  buttonClassName?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className = '',
  buttonClassName = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(o => o.id === value)

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-800 text-xs sm:text-sm flex items-center justify-between shadow-2xs transition-all ${
          isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
        } ${buttonClassName}`}
      >
        <span className={`truncate flex items-center gap-2 ${selectedOption ? 'font-semibold text-slate-800' : 'text-slate-500 font-medium'}`}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="text-base shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 4, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-50 max-h-64 overflow-y-auto bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col gap-0.5 no-scrollbar min-w-[200px]"
            >
              {options.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center font-medium">Nenhuma opção disponível</div>
              ) : (
                (() => {
                  let lastGroup: string | undefined = undefined;
                  return options.map(opt => {
                    const isSelected = opt.id === value;
                    const showGroupHeader = opt.group && opt.group !== lastGroup;
                    if (opt.group) lastGroup = opt.group;

                    return (
                      <div key={opt.id} className="flex flex-col">
                        {showGroupHeader && (
                          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/90 rounded-lg my-1 border-y border-slate-100/80">
                            {opt.group}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onChange(opt.id)
                            setIsOpen(false)
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                            isSelected 
                              ? 'bg-emerald-50 text-emerald-800 font-bold' 
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {opt.icon && <span className="text-base shrink-0">{opt.icon}</span>}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                        </button>
                      </div>
                    );
                  });
                })()
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
