'use client'

import { useEffect, useRef } from 'react'
import { DollarSign, TrendingUp, Wallet, Coins, PieChart, CreditCard, Activity, BarChart3, LineChart } from 'lucide-react'

const icons = [DollarSign, TrendingUp, Wallet, Coins, PieChart, CreditCard, Activity, BarChart3, LineChart]

const NUM_PARTICLES = 35

const generateParticles = () => {
  if (typeof window === 'undefined') return []
  
  return Array.from({ length: NUM_PARTICLES }).map((_, i) => ({
    id: i,
    Icon: icons[Math.floor(Math.random() * icons.length)],
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight - window.innerHeight, 
    size: Math.random() * 24 + 16, 
    opacity: Math.random() * 0.4 + 0.1, 
    rotation: Math.random() * 360,
    speedY: Math.random() * 1.5 + 0.5,
    speedRotation: (Math.random() - 0.5) * 2,
    color: ['text-emerald-400', 'text-blue-400', 'text-slate-300'][Math.floor(Math.random() * 3)]
  }))
}

export function FloatingIconsBackground() {
  const mousePos = useRef({ x: -1000, y: -1000 })
  const requestRef = useRef<number | null>(null)
  
  // Guardamos as propriedades físicas fora do React State para performance máxima
  const particlesData = useRef(typeof window !== 'undefined' ? generateParticles() : [])
  // Guardamos as referências do DOM para atualizar via CSS direto (bypassa o React)
  const iconRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleResize = () => {
      particlesData.current = generateParticles()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const animate = () => {
      particlesData.current.forEach((p, i) => {
        let newY = p.y + p.speedY
        let newX = p.x
        let newRot = p.rotation + p.speedRotation

        if (newY > window.innerHeight + 50) {
          newY = -50
          newX = Math.random() * window.innerWidth
        }

        const dx = mousePos.current.x - newX
        const dy = mousePos.current.y - newY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const maxDistance = 150

        if (distance < maxDistance) {
          const force = (maxDistance - distance) / maxDistance
          newX -= (dx / distance) * force * 5
          newY -= (dy / distance) * force * 5
          newRot += force * 10 
        }

        p.x = newX
        p.y = newY
        p.rotation = newRot

        // Atualização Direta no DOM! Zero travamento no React.
        const el = iconRefs.current[i]
        if (el) {
          el.style.transform = `translate(${newX}px, ${newY}px) rotate(${newRot}deg)`
        }
      })

      requestRef.current = requestAnimationFrame(animate)
    }

    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [])

  if (particlesData.current.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particlesData.current.map((p, i) => {
        const Icon = p.Icon
        return (
          <div
            key={p.id}
            ref={(el) => {
              iconRefs.current[i] = el
            }}
            className={`absolute ${p.color} will-change-transform`}
            style={{
              opacity: p.opacity,
              // O transform inicial
              transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`,
            }}
          >
            <Icon size={p.size} strokeWidth={1.5} />
          </div>
        )
      })}
    </div>
  )
}
