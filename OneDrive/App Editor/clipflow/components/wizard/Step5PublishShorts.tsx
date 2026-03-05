'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Check, X, ExternalLink, ArrowRight, AlertTriangle } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { PublishStatus } from '@/types'

const PLATFORMS = [
  { id: 'youtubeShorts', label: 'YouTube Shorts', color: '#EF4444' },
  { id: 'instagramReels', label: 'Instagram', color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', color: '#00f2ea' },
]

const PLATFORM_MAP: Record<string, string> = {
  youtubeShorts: 'youtube',
  instagramReels: 'instagram',
  tiktok: 'tiktok',
}

const UPLOADPOST_BASE = 'https://api.upload-post.com'

function StatusCell({ status }: { status?: PublishStatus }) {
  if (!status || status.status === 'pending') return <div className="w-6 h-6 rounded-full border border-white/[0.12] bg-white/[0.04]" />
  if (status.status === 'processing') return <div title="Processing clip..."><Loader2 size={16} className="text-amber-400 animate-spin" /></div>
  if (status.status === 'uploading') return <div title="Uploading..."><Loader2 size={16} className="text-[#7C3AED] animate-spin" /></div>
  if (status.status === 'done') {
    return status.link ? (
      <a href={status.link} target="_blank" rel="noopener noreferrer" title="View post">
        <Check size={16} className="text-green-400" strokeWidth={3} />
      </a>
    ) : <Check size={16} className="text-green-400" strokeWidth={3} />
  }
  if (status.status === 'error') return (
    <div title={status.error} className="cursor-help">
      <X size={16} className="text-red-400" />
    </div>
  )
  return <div className="w-4 h-4 rounded-full border-2 border-dashed border-white/[0.2]" />
}

export function Step5PublishShorts() {
  const { videoUrl, shortClips, settings, publishStatuses, setPublishStatus, addPublishedLink, nextStep } = useFlowStore()
  const [publishing, setPublishing] = useState(false)
  const [done, setDone] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'processing' | 'uploading' | 'done'>('idle')
  const [phaseDetail, setPhaseDetail] = useState('')

  const selectedClips = shortClips.filter((c) => c.selected)

  const allDone = PLATFORMS.every((p) =>
    selectedClips.every((c) => {
      const s = publishStatuses.find((ps) => ps.platform === p.id && ps.clipId === c.id)
      return s?.status === 'done' || s?.status === 'error'
    })
  )

  const successCount = publishStatuses.filter((s) => s.status === 'done').length
  const errorCount = publishStatuses.filter((s) => s.status === 'error').length

  const startPublishing = async () => {
    if (!settings.uploadpostApiKey) {
      toast.error('Missing UploadPost API key', { description: 'Configure in Settings.' })
      return
    }
    if (!videoUrl) {
      toast.error('No video URL found', { description: 'Please restart from Step 1.' })
      return
    }
    setPublishing(true)

    try {
      const { processClipRemote } = await import('@/lib/uploadpost-ffmpeg')

      // Process each clip in the cloud (Upload-Post fetches the video directly from the Blob URL)
      for (const clip of selectedClips) {
        PLATFORMS.forEach((p) => setPublishStatus({ platform: p.id, clipId: clip.id, status: 'processing' }))

        setPhase('processing')
        setPhaseDetail(`Procesando clip ${clip.index + 1} en la nube: ${clip.title}`)

        let clipBuffer: ArrayBuffer
        try {
          clipBuffer = await processClipRemote({
            apiKey: settings.uploadpostApiKey,
            videoUrl,
            startTime: clip.startTime,
            duration: clip.endTime - clip.startTime,
          })
        } catch (e: any) {
          PLATFORMS.forEach((p) =>
            setPublishStatus({ platform: p.id, clipId: clip.id, status: 'error', error: `FFmpeg: ${e.message}` })
          )
          continue
        }

        const clipData = new Uint8Array(clipBuffer)

        // 4. Upload to all 3 platforms in parallel
        setPhase('uploading')
        PLATFORMS.forEach((p) => setPublishStatus({ platform: p.id, clipId: clip.id, status: 'uploading' }))

        // Build description once (shared across platforms)
        const descWithHashtags = clip.hashtags.length > 0
          ? `${clip.description}\n\n${clip.hashtags.map((h) => `#${h}`).join(' ')}`
          : clip.description

        await Promise.all(
          PLATFORMS.map(async (platform) => {
            try {
              // Upload directly from browser to Upload-Post — avoids Vercel's 4.5MB body limit
              const formData = new FormData()
              formData.append('user', settings.uploadpostUser || 'default')
              formData.append('platform[]', PLATFORM_MAP[platform.id] ?? platform.id)
              formData.append('video', new Blob([clipData], { type: 'video/mp4' }), 'clip.mp4')
              formData.append('title', clip.title)
              formData.append('description', descWithHashtags)

              const res = await fetch(`${UPLOADPOST_BASE}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Apikey ${settings.uploadpostApiKey}` },
                body: formData,
              })
              if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message ?? `UploadPost error ${res.status}`)
              }
              const data = await res.json()
              const link = data.url ?? data.link ?? data.post_url ?? ''
              setPublishStatus({ platform: platform.id, clipId: clip.id, status: 'done', link })
              addPublishedLink(platform.id as any, link)
            } catch (e: any) {
              setPublishStatus({ platform: platform.id, clipId: clip.id, status: 'error', error: e.message })
            }
          })
        )
      }
    } catch (e: any) {
      toast.error('Publishing failed', { description: e.message })
    }

    setPhase('done')
    setPublishing(false)
    setDone(true)
  }

  useEffect(() => {
    if (!publishing && !done) startPublishing()
  }, [])

  useEffect(() => {
    if (!allDone || !done) return
    if (errorCount === 0) {
      toast.success('All clips published!', { description: `${successCount} posts live across ${PLATFORMS.length} platforms.` })
    } else if (successCount > 0) {
      toast.warning(`${successCount} published, ${errorCount} failed`, { description: 'See error details below.' })
    } else {
      toast.error('Publishing failed', { description: 'See error details below.' })
    }
  }, [allDone, done])

  const phaseLabel: Record<string, string> = {
    'processing': 'Procesando clip en la nube...',
    'uploading': 'Subiendo a plataformas...',
    'done': 'Listo',
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-syne)' }}>
            Publishing <span className="gradient-text">Shorts</span>
          </h1>
          <p className="text-muted-foreground">
            Cutting &amp; uploading {selectedClips.length} clips across {PLATFORMS.length} platforms
          </p>
        </div>

        {/* Phase indicator */}
        {publishing && phase !== 'idle' && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-5 py-4 flex items-center gap-3">
            <Loader2 size={16} className="text-[#7C3AED] animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium">{phaseLabel[phase] ?? phase}</p>
              <p className="text-xs text-muted-foreground">{phaseDetail}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="grid bg-white/[0.04] border-b border-white/[0.06]" style={{ gridTemplateColumns: `1fr repeat(${PLATFORMS.length}, 120px)` }}>
            <div className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Clip</div>
            {PLATFORMS.map((p) => (
              <div key={p.id} className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                {p.label}
              </div>
            ))}
          </div>

          {selectedClips.map((clip, i) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="grid border-b border-white/[0.04] last:border-0"
              style={{ gridTemplateColumns: `1fr repeat(${PLATFORMS.length}, 120px)` }}
            >
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{clip.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {Math.floor(clip.startTime / 60)}:{String(Math.floor(clip.startTime % 60)).padStart(2, '0')} — {Math.floor(clip.endTime / 60)}:{String(Math.floor(clip.endTime % 60)).padStart(2, '0')}
                  </p>
                </div>
              </div>
              {PLATFORMS.map((p) => {
                const status = publishStatuses.find((ps) => ps.platform === p.id && ps.clipId === clip.id)
                return (
                  <div key={p.id} className="flex items-center justify-center py-4">
                    <StatusCell status={status} />
                  </div>
                )
              })}
            </motion.div>
          ))}
        </div>

        {allDone && successCount > 0 && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-5 py-4">
            <p className="text-sm text-green-400 font-medium mb-3">
              ✅ {successCount} clip{successCount > 1 ? 's' : ''} published successfully!
            </p>
            <div className="space-y-2">
              {publishStatuses.filter((s) => s.status === 'done' && s.link).map((s) => (
                <a
                  key={`${s.platform}-${s.clipId}`}
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={11} />
                  {s.platform} — Clip {shortClips.findIndex((c) => c.id === s.clipId) + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {allDone && errorCount > 0 && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-red-400 font-medium mb-2">
              <AlertTriangle size={14} />
              {errorCount} upload{errorCount > 1 ? 's' : ''} failed
            </div>
            <div className="space-y-1">
              {publishStatuses.filter((s) => s.status === 'error').map((s) => (
                <p key={`${s.platform}-${s.clipId}`} className="text-xs text-muted-foreground">
                  {s.platform} · Clip {shortClips.findIndex((c) => c.id === s.clipId) + 1}: {s.error}
                </p>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={nextStep}
          disabled={!allDone}
          size="lg"
          className="w-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] hover:opacity-90 text-white font-semibold gap-2 h-12 disabled:opacity-40"
        >
          Generate Reddit &amp; LinkedIn Posts
          <ArrowRight size={16} />
        </Button>
      </motion.div>
    </div>
  )
}
