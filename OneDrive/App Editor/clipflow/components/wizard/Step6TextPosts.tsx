'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ExternalLink, ArrowRight, MessageSquare, Linkedin } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function Step6TextPosts() {
  const { analysisResult, youtubeLink, settings, textPosts, setTextPosts, updateTextPost, addPublishedLink, nextStep } = useFlowStore()
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState<'reddit' | 'linkedin' | null>(null)
  const [publishedReddit, setPublishedReddit] = useState<string | null>(null)
  const [publishedLinkedin, setPublishedLinkedin] = useState<string | null>(null)

  const generatePosts = async () => {
    if (!settings.anthropicApiKey) {
      toast.error('Missing OpenRouter API key')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: analysisResult?.transcript,
          visualDescription: analysisResult?.visualDescription,
          youtubeTitle: analysisResult?.title,
          youtubeDescription: analysisResult?.description,
          youtubeLink,
          defaultSubreddit: settings.defaultSubreddit,
          apiKey: settings.anthropicApiKey,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setTextPosts(data)
      toast.success('Posts generated!')
    } catch (e: any) {
      toast.error('Generation failed', { description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const publishPlatform = async (platform: 'reddit' | 'linkedin') => {
    if (!settings.uploadpostApiKey) {
      toast.error('Missing UploadPost API key')
      return
    }
    setPublishing(platform)
    try {
      const res = await fetch('/api/publish-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          content: textPosts?.[platform],
          apiKey: settings.uploadpostApiKey,
          uploadpostUser: settings.uploadpostUser,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      if (platform === 'reddit') {
        setPublishedReddit(data.link)
        addPublishedLink('reddit', data.link)
      } else {
        setPublishedLinkedin(data.link)
        addPublishedLink('linkedin', data.link)
      }
      toast.success(`Published to ${platform === 'reddit' ? 'Reddit' : 'LinkedIn'}!`)
    } catch (e: any) {
      toast.error(`${platform} publish failed`, { description: e.message })
    } finally {
      setPublishing(null)
    }
  }

  useEffect(() => {
    if (!textPosts) generatePosts()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-syne)' }}>
            Text <span className="gradient-text">Posts</span>
          </h1>
          <p className="text-muted-foreground">
            AI-crafted posts optimized for Reddit & LinkedIn
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 size={32} className="text-[#7C3AED] animate-spin" />
            <p className="text-muted-foreground">Generating posts with Gemini...</p>
          </div>
        ) : textPosts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reddit */}
            <div className="rounded-2xl border border-white/[0.08] p-5 space-y-4 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <MessageSquare size={16} className="text-orange-400" />
                  </div>
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-syne)' }}>Reddit</span>
                </div>
                {publishedReddit ? (
                  <a href={publishedReddit} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-400">
                    <ExternalLink size={12} /> View post
                  </a>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => publishPlatform('reddit')}
                    disabled={publishing === 'reddit'}
                    className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/30 border text-xs h-8"
                  >
                    {publishing === 'reddit' ? <Loader2 size={12} className="animate-spin" /> : 'Publish'}
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Subreddit</label>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground text-sm self-center">r/</span>
                    <Input
                      value={textPosts.reddit.subreddit}
                      onChange={(e) => updateTextPost('reddit', 'subreddit', e.target.value)}
                      className="bg-white/[0.04] border-white/[0.08] text-sm h-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
                  <Input
                    value={textPosts.reddit.title}
                    onChange={(e) => updateTextPost('reddit', 'title', e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Body</label>
                  <Textarea
                    value={textPosts.reddit.body}
                    onChange={(e) => updateTextPost('reddit', 'body', e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-sm min-h-[200px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* LinkedIn */}
            <div className="rounded-2xl border border-white/[0.08] p-5 space-y-4 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Linkedin size={16} className="text-blue-400" />
                  </div>
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-syne)' }}>LinkedIn</span>
                </div>
                {publishedLinkedin ? (
                  <a href={publishedLinkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-400">
                    <ExternalLink size={12} /> View post
                  </a>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => publishPlatform('linkedin')}
                    disabled={publishing === 'linkedin'}
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-600/30 border text-xs h-8"
                  >
                    {publishing === 'linkedin' ? <Loader2 size={12} className="animate-spin" /> : 'Publish'}
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Hook</label>
                  <Input
                    value={textPosts.linkedin.hook}
                    onChange={(e) => updateTextPost('linkedin', 'hook', e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Post Body</label>
                  <Textarea
                    value={textPosts.linkedin.body}
                    onChange={(e) => updateTextPost('linkedin', 'body', e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-sm min-h-[230px] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Button
          onClick={nextStep}
          size="lg"
          className="w-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] hover:opacity-90 text-white font-semibold gap-2 h-12"
        >
          View Summary & Send Email
          <ArrowRight size={16} />
        </Button>
      </motion.div>
    </div>
  )
}
