'use client'

import { useState, useEffect } from 'react'
import { Settings, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/store/useFlowStore'
import { Button } from '@/components/ui/button'

export function Header() {
  const { setSettingsOpen, currentStep, reset } = useFlowStore()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    reset()
    setConfirming(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] glass">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 8L3 13V3Z" fill="white" />
            </svg>
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            <span className="gradient-text">Clip</span>
            <span className="text-white">Flow</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className={`gap-2 text-sm transition-colors ${
                confirming
                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
              }`}
            >
              <RotateCcw size={14} />
              {confirming ? 'Sure? Click again' : 'Start over'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
          >
            <Settings size={15} />
            <span className="text-sm">Settings</span>
          </Button>
        </motion.div>
      </div>
    </header>
  )
}
