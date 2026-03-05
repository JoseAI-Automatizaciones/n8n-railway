'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { Settings } from '@/types'

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  docLink,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  docLink?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </label>
        {docLink && (
          <a
            href={docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            How to get <ExternalLink size={10} />
          </a>
        )}
      </div>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••••••••••'}
          className="bg-white/[0.04] border-white/[0.08] text-sm pr-10 font-mono placeholder:font-sans"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function TestButton({ onTest, label }: { onTest: () => Promise<boolean>; label: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  const run = async () => {
    setStatus('loading')
    const ok = await onTest()
    setStatus(ok ? 'ok' : 'error')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <button
      onClick={run}
      disabled={status === 'loading'}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {status === 'loading' && <Loader2 size={12} className="animate-spin" />}
      {status === 'ok' && <CheckCircle2 size={12} className="text-green-400" />}
      {status === 'error' && <XCircle size={12} className="text-red-400" />}
      {status === 'idle' && <span className="w-3 h-3 rounded-full border border-muted-foreground/50" />}
      Test {label}
    </button>
  )
}

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, settings, updateSettings } = useFlowStore()

  const handleSave = () => {
    toast.success('Settings saved', { description: 'All API keys have been saved locally.' })
    setSettingsOpen(false)
  }

  const testApi = (key: string, url: string, headers: Record<string, string> = {}) =>
    async () => {
      try {
        const r = await fetch('/api/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, url, headers }),
        })
        return r.ok
      } catch {
        return false
      }
    }

  return (
    <AnimatePresence>
      {settingsOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0F0F1A] border-l border-white/[0.08] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <div>
                <h2 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-syne)' }}>
                  Settings
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stored locally in your browser
                </p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-white/[0.05]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Tabs defaultValue="apis">
                <TabsList className="w-full bg-white/[0.04] border border-white/[0.08] mb-6">
                  <TabsTrigger value="apis" className="flex-1 text-xs">API Keys</TabsTrigger>
                  <TabsTrigger value="publishing" className="flex-1 text-xs">Publishing</TabsTrigger>
                  <TabsTrigger value="advanced" className="flex-1 text-xs">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="apis" className="space-y-5 mt-0">
                  <div className="space-y-3">
                    <PasswordField
                      label="OpenRouter API Key"
                      value={settings.openrouterApiKey}
                      onChange={(v) => updateSettings({ openrouterApiKey: v })}
                      placeholder="sk-or-v1-..."
                      docLink="https://openrouter.ai/keys"
                    />
                    <TestButton
                      label="OpenRouter"
                      onTest={testApi('openrouter', 'https://openrouter.ai/api/v1/models', {
                        Authorization: `Bearer ${settings.openrouterApiKey}`,
                      })}
                    />
                  </div>

                  <div className="w-full h-px bg-white/[0.06]" />

                  <div className="space-y-3">
                    <PasswordField
                      label="Google AI API Key (for video analysis)"
                      value={settings.googleAiKey}
                      onChange={(v) => updateSettings({ googleAiKey: v })}
                      placeholder="AIzaSy..."
                      docLink="https://aistudio.google.com/apikey"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Required for analyzing large videos (&gt;5 min). Free at ai.google.dev.
                    </p>
                  </div>

                  <div className="w-full h-px bg-white/[0.06]" />

                  <div className="space-y-3">
                    <PasswordField
                      label="kie.ai API Key"
                      value={settings.kieaiApiKey}
                      onChange={(v) => updateSettings({ kieaiApiKey: v })}
                      placeholder="kie-..."
                      docLink="https://kie.ai"
                    />
                  </div>

                  <div className="w-full h-px bg-white/[0.06]" />

                  <div className="space-y-3">
                    <PasswordField
                      label="UploadPost API Key"
                      value={settings.uploadpostApiKey}
                      onChange={(v) => updateSettings({ uploadpostApiKey: v })}
                      docLink="https://upload-post.com"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        UploadPost Profile ID
                      </label>
                      <Input
                        value={settings.uploadpostUser}
                        onChange={(e) => updateSettings({ uploadpostUser: e.target.value })}
                        placeholder="your-profile-id"
                        className="bg-white/[0.04] border-white/[0.08] text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        The profile identifier from your Upload-Post connected accounts.
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-white/[0.06]" />

                  <div className="space-y-3">
                    <PasswordField
                      label="Resend API Key"
                      value={settings.resendApiKey}
                      onChange={(v) => updateSettings({ resendApiKey: v })}
                      placeholder="re_..."
                      docLink="https://resend.com/api-keys"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="publishing" className="space-y-5 mt-0">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Email destination
                    </label>
                    <Input
                      type="email"
                      value={settings.emailDestination}
                      onChange={(e) => updateSettings({ emailDestination: e.target.value })}
                      placeholder="you@example.com"
                      className="bg-white/[0.04] border-white/[0.08] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      YouTube Privacy
                    </label>
                    <select
                      value={settings.youtubePrivacyStatus}
                      onChange={(e) =>
                        updateSettings({
                          youtubePrivacyStatus: e.target.value as Settings['youtubePrivacyStatus'],
                        })
                      }
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-foreground"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Default subreddit
                    </label>
                    <Input
                      value={settings.defaultSubreddit}
                      onChange={(e) => updateSettings({ defaultSubreddit: e.target.value })}
                      placeholder="programming"
                      className="bg-white/[0.04] border-white/[0.08] text-sm"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-5 mt-0">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Frame analysis interval (seconds)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={settings.frameAnalysisInterval}
                      onChange={(e) =>
                        updateSettings({ frameAnalysisInterval: parseInt(e.target.value) || 5 })
                      }
                      className="bg-white/[0.04] border-white/[0.08] text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Camera Overlay Position (OBS)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Position of the presenter camera overlay in the 16:9 source video (pixels).
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['cameraOverlayX', 'cameraOverlayY', 'cameraOverlayWidth', 'cameraOverlayHeight'] as const).map((k) => (
                        <div key={k} className="space-y-1">
                          <label className="text-xs text-muted-foreground capitalize">
                            {k.replace('cameraOverlay', '')}
                          </label>
                          <Input
                            type="number"
                            value={settings[k]}
                            onChange={(e) =>
                              updateSettings({ [k]: parseInt(e.target.value) || 0 })
                            }
                            className="bg-white/[0.04] border-white/[0.08] text-sm font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06]">
              <Button
                onClick={handleSave}
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] hover:opacity-90 text-white font-medium"
              >
                Save Configuration
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
