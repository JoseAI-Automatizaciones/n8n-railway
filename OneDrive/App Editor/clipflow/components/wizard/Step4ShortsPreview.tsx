'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Check, X, ArrowRight, Scissors, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { ShortClip } from '@/types'

function HashtagInput({
  hashtags,
  onChange,
}: {
  hashtags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim().replace(/^#/, '')
    if (tag && !hashtags.includes(tag)) onChange([...hashtags, tag])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/30"
          >
            #{tag}
            <button onClick={() => onChange(hashtags.filter((t) => t !== tag))}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add hashtag..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#7C3AED]/50"
        />
        <button onClick={add} className="text-xs px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-muted-foreground hover:text-foreground">
          Add
        </button>
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ClipCard({ clip, videoUrl, onUpdate, onToggle, selectionCount }: {
  clip: ShortClip
  videoUrl: string | null
  onUpdate: (updates: Partial<ShortClip>) => void
  onToggle: () => void
  selectionCount: number
}) {
  const canSelect = clip.selected || selectionCount < 3
  const [showPreview, setShowPreview] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePreview = () => {
    setShowPreview((prev) => !prev)
  }

  useEffect(() => {
    if (showPreview && videoRef.current && videoUrl) {
      videoRef.current.currentTime = clip.startTime
      videoRef.current.play().catch(() => {})
    }
  }, [showPreview])

  // Auto-stop at endTime
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= clip.endTime) {
      videoRef.current.pause()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 space-y-3 transition-colors ${
        clip.selected
          ? 'border-[#7C3AED]/60 bg-[#7C3AED]/5'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={clip.selected}
            onCheckedChange={() => canSelect && onToggle()}
            disabled={!canSelect}
            className="border-white/[0.2]"
          />
          <div>
            <span className="text-xs text-muted-foreground font-mono">Clip {clip.index + 1}</span>
            <div className="text-xs text-muted-foreground/70 font-mono">
              {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
            </div>
          </div>
        </div>

        {videoUrl && (
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] transition-colors"
          >
            {showPreview ? <ChevronUp size={12} /> : <Play size={12} />}
            {showPreview ? 'Hide' : 'Preview'}
          </button>
        )}
      </div>

      {/* Inline video preview */}
      {showPreview && videoUrl && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl overflow-hidden bg-black"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full max-h-48 object-contain"
            controls
            onTimeUpdate={handleTimeUpdate}
          />
          <p className="text-xs text-muted-foreground text-center py-1.5">
            Plays from {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
          </p>
        </motion.div>
      )}

      {/* Editable fields */}
      <div className="space-y-2">
        <Input
          value={clip.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Short title..."
          className="bg-white/[0.04] border-white/[0.08] text-xs h-8"
          maxLength={60}
        />
        <Textarea
          value={clip.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Short description..."
          className="bg-white/[0.04] border-white/[0.08] text-xs min-h-[60px] resize-none"
          maxLength={200}
        />
        <HashtagInput
          hashtags={clip.hashtags}
          onChange={(tags) => onUpdate({ hashtags: tags })}
        />
      </div>

      {clip.selected && (
        <div className="flex items-center gap-1.5 text-xs text-[#7C3AED]">
          <Check size={12} strokeWidth={3} />
          Selected for publishing
        </div>
      )}
    </motion.div>
  )
}

export function Step4ShortsPreview() {
  const { videoUrl, analysisResult, settings, shortClips, setShortClips, updateShortClip, toggleClipSelection, nextStep } = useFlowStore()
  const [loading, setLoading] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const durationRef = useRef<number | null>(null)

  const selectedCount = shortClips.filter((c) => c.selected).length

  const generateShorts = async (knownDuration?: number) => {
    if (!videoUrl || !settings.anthropicApiKey) {
      toast.error('Missing config', { description: 'OpenRouter API key required.' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/generate-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoUrl,
          transcript: analysisResult?.transcript,
          visualDescription: analysisResult?.visualDescription,
          apiKey: settings.anthropicApiKey,
          videoDuration: knownDuration ?? durationRef.current ?? undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Shorts generation failed')
      const data = await res.json()
      setShortClips(data.clips)
      toast.success('6 clips identified!')
    } catch (e: any) {
      toast.error('Generation failed', { description: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Load video duration from the source video before generating
  useEffect(() => {
    if (!videoUrl || shortClips.length > 0) return
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = videoUrl
    video.onloadedmetadata = () => {
      const dur = video.duration
      durationRef.current = dur
      setVideoDuration(dur)
      video.src = ''
      generateShorts(dur)
    }
    video.onerror = () => {
      video.src = ''
      generateShorts()
    }
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-syne)' }}>
              Viral <span className="gradient-text">Shorts</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Preview each clip, then select exactly 3 to publish
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border ${
              selectedCount === 3 ? 'border-green-500/40 bg-green-500/10 text-green-400' :
              'border-white/[0.08] bg-white/[0.04] text-muted-foreground'
            }`}>
              <span className="font-mono font-bold">{selectedCount}</span>/3 selected
            </div>
            {shortClips.length > 0 && (
              <button onClick={() => generateShorts()} disabled={loading} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.04]">
                <Scissors size={14} />
                Regenerate
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center">
              <Scissors size={28} className="text-[#7C3AED] animate-pulse" />
            </div>
            <p className="text-foreground font-medium">Identifying viral moments...</p>
            <p className="text-sm text-muted-foreground">Gemini is analyzing the transcript</p>
            <Loader2 size={20} className="text-[#7C3AED] animate-spin" />
          </div>
        ) : shortClips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shortClips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                videoUrl={videoUrl}
                onUpdate={(updates) => updateShortClip(clip.id, updates)}
                onToggle={() => toggleClipSelection(clip.id)}
                selectionCount={selectedCount}
              />
            ))}
          </div>
        ) : null}

        {selectedCount < 3 && shortClips.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {selectedCount === 0 ? 'Select 3 clips to continue' : `Select ${3 - selectedCount} more clip${3 - selectedCount > 1 ? 's' : ''}`}
          </p>
        )}

        <Button
          onClick={nextStep}
          disabled={selectedCount !== 3}
          size="lg"
          className="w-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] hover:opacity-90 text-white font-semibold gap-2 h-12 disabled:opacity-40"
        >
          Publish {selectedCount === 3 ? '3 Selected Clips' : 'Clips'} to All Platforms
          <ArrowRight size={16} />
        </Button>
      </motion.div>
    </div>
  )
}
