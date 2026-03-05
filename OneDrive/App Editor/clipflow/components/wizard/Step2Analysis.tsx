'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ArrowRight, Sparkles, Loader2, Check } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const STAGES = [
  'Subiendo audio a AssemblyAI...',
  'Transcribiendo con AssemblyAI...',
  'Procesando transcripción...',
  'Generando título y descripción en español...',
  'Creando prompt para thumbnail...',
]

function LoadingStage({ stage, done }: { stage: string; done: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3"
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-green-500/20' : 'bg-[#7C3AED]/20'
      }`}>
        {done ? (
          <Check size={11} className="text-green-400" strokeWidth={3} />
        ) : (
          <Loader2 size={11} className="text-[#7C3AED] animate-spin" />
        )}
      </div>
      <span className={`text-sm ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
        {stage}
      </span>
    </motion.div>
  )
}

export function Step2Analysis() {
  const { videoUrl, settings, analysisResult, setAnalysisResult, updateAnalysisField, nextStep } = useFlowStore()
  const [loading, setLoading] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const runAnalysis = async () => {
    if (!videoUrl || !settings.anthropicApiKey || !settings.assemblyAiKey) {
      toast.error('Configuración incompleta', { description: 'Agrega tu Anthropic API key y AssemblyAI API key en Settings.' })
      return
    }
    setLoading(true)
    setStageIndex(0)

    // Simulate stage progression
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1))
    }, 2500)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoUrl,
          apiKey: settings.anthropicApiKey,
          assemblyAiKey: settings.assemblyAiKey,
          frameInterval: settings.frameAnalysisInterval,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }
      const data = await res.json()
      setAnalysisResult(data)
      toast.success('Analysis complete!')
    } catch (e: any) {
      toast.error('Analysis failed', { description: e.message })
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const regenerateField = async (field: 'title' | 'description' | 'thumbnailPrompt') => {
    if (!settings.anthropicApiKey) return
    setRegenerating(field)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoUrl,
          apiKey: settings.anthropicApiKey,
          frameInterval: settings.frameAnalysisInterval,
          regenerate: field,
          existing: analysisResult,
        }),
      })
      if (!res.ok) throw new Error('Regeneration failed')
      const data = await res.json()
      updateAnalysisField(field, data[field])
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} regenerated`)
    } catch (e: any) {
      toast.error('Regeneration failed', { description: e.message })
    } finally {
      setRegenerating(null)
    }
  }

  useEffect(() => {
    if (!analysisResult && videoUrl) runAnalysis()
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-syne)' }}>
            <span className="gradient-text">AI Analysis</span>
          </h1>
          <p className="text-muted-foreground">
            Gemini 2.5 Pro is analyzing your video content
          </p>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/[0.08] p-8 bg-white/[0.02] space-y-6"
            >
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center">
                  <Sparkles size={28} className="text-[#7C3AED]" />
                </div>
              </div>
              <div className="space-y-3">
                {STAGES.map((stage, i) => (
                  <LoadingStage key={stage} stage={stage} done={i < stageIndex} />
                ))}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] rounded-full"
                  animate={{ width: `${(stageIndex / (STAGES.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          ) : analysisResult ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    YouTube Title
                  </label>
                  <button
                    onClick={() => regenerateField('title')}
                    disabled={!!regenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#7C3AED] transition-colors"
                  >
                    {regenerating === 'title' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    Regenerate
                  </button>
                </div>
                <Input
                  value={analysisResult.title}
                  onChange={(e) => updateAnalysisField('title', e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-sm"
                  maxLength={100}
                />
                <p className="text-xs text-right text-muted-foreground">
                  {analysisResult.title.length}/100
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    YouTube Description
                  </label>
                  <button
                    onClick={() => regenerateField('description')}
                    disabled={!!regenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#7C3AED] transition-colors"
                  >
                    {regenerating === 'description' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    Regenerate
                  </button>
                </div>
                <Textarea
                  value={analysisResult.description}
                  onChange={(e) => updateAnalysisField('description', e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-sm min-h-[160px] resize-none"
                />
              </div>

              {/* Thumbnail Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Thumbnail Prompt
                  </label>
                  <button
                    onClick={() => regenerateField('thumbnailPrompt')}
                    disabled={!!regenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#7C3AED] transition-colors"
                  >
                    {regenerating === 'thumbnailPrompt' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    Regenerate
                  </button>
                </div>
                <Textarea
                  value={analysisResult.thumbnailPrompt}
                  onChange={(e) => updateAnalysisField('thumbnailPrompt', e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-sm min-h-[100px] resize-none font-mono text-xs"
                />
              </div>

              <Button
                onClick={nextStep}
                size="lg"
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] hover:opacity-90 text-white font-semibold gap-2 h-12"
              >
                Generate Thumbnail & Upload to YouTube
                <ArrowRight size={16} />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="empty" className="text-center py-12">
              <Button onClick={runAnalysis} className="bg-[#7C3AED] hover:bg-[#7C3AED]/80">
                Start Analysis
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
