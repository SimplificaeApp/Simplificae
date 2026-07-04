import { FloatingIconsBackground } from '@/components/layout/FloatingIconsBackground'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background Orbs / Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-300/30 rounded-full blur-3xl opacity-60 animate-pulse pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-300/30 rounded-full blur-3xl opacity-60 animate-pulse pointer-events-none z-0" style={{ animationDelay: '2s' }} />

      {/* Partículas Financeiras interativas com o cursor */}
      <FloatingIconsBackground />

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
