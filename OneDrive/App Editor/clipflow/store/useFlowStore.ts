import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  WizardStep,
  VideoFile,
  AnalysisResult,
  ShortClip,
  TextPost,
  PublishedLinks,
  Settings,
  DEFAULT_SETTINGS,
  PublishStatus,
} from '@/types'

interface FlowState {
  // Wizard navigation
  currentStep: WizardStep
  // Step 1
  videoFile: VideoFile | null
  videoUrl: string | null
  // Step 2
  analysisResult: AnalysisResult | null
  // Step 3
  thumbnailUrl: string | null
  youtubeVideoId: string | null
  youtubeLink: string | null
  // Step 4
  shortClips: ShortClip[]
  // Step 5
  publishStatuses: PublishStatus[]
  // Step 6
  textPosts: TextPost | null
  // Step 7
  publishedLinks: PublishedLinks
  // Settings
  settings: Settings
  // UI state
  settingsOpen: boolean
}

interface FlowActions {
  setStep: (step: WizardStep) => void
  nextStep: () => void
  setVideoFile: (file: VideoFile | null) => void
  setVideoUrl: (url: string | null) => void
  setAnalysisResult: (result: AnalysisResult | null) => void
  updateAnalysisField: (field: keyof AnalysisResult, value: string) => void
  setThumbnailUrl: (url: string | null) => void
  setYoutubeLink: (videoId: string, link: string) => void
  setShortClips: (clips: ShortClip[]) => void
  updateShortClip: (id: string, updates: Partial<ShortClip>) => void
  toggleClipSelection: (id: string) => void
  setPublishStatus: (status: PublishStatus) => void
  setTextPosts: (posts: TextPost | null) => void
  updateTextPost: (platform: 'reddit' | 'linkedin', field: string, value: string) => void
  addPublishedLink: (platform: keyof PublishedLinks, link: string) => void
  setPublishedLinks: (links: Partial<PublishedLinks>) => void
  updateSettings: (settings: Partial<Settings>) => void
  setSettingsOpen: (open: boolean) => void
  reset: () => void
}

const initialPublishedLinks: PublishedLinks = {
  youtubeShorts: [],
  instagramReels: [],
  tiktok: [],
}

export const useFlowStore = create<FlowState & FlowActions>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      videoFile: null,
      videoUrl: null,
      analysisResult: null,
      thumbnailUrl: null,
      youtubeVideoId: null,
      youtubeLink: null,
      shortClips: [],
      publishStatuses: [],
      textPosts: null,
      publishedLinks: initialPublishedLinks,
      settings: DEFAULT_SETTINGS,
      settingsOpen: false,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((s) => ({ currentStep: Math.min(7, s.currentStep + 1) as WizardStep })),

      setVideoFile: (file) => set({ videoFile: file }),
      setVideoUrl: (url) => set({ videoUrl: url }),

      setAnalysisResult: (result) => set({ analysisResult: result }),
      updateAnalysisField: (field, value) =>
        set((s) => ({
          analysisResult: s.analysisResult ? { ...s.analysisResult, [field]: value } : null,
        })),

      setThumbnailUrl: (url) => set({ thumbnailUrl: url }),
      setYoutubeLink: (videoId, link) =>
        set({ youtubeVideoId: videoId, youtubeLink: link }),

      setShortClips: (clips) => set({ shortClips: clips }),
      updateShortClip: (id, updates) =>
        set((s) => ({
          shortClips: s.shortClips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      toggleClipSelection: (id) =>
        set((s) => {
          const clip = s.shortClips.find((c) => c.id === id)
          if (!clip) return s
          const selectedCount = s.shortClips.filter((c) => c.selected).length
          if (!clip.selected && selectedCount >= 3) return s
          return {
            shortClips: s.shortClips.map((c) =>
              c.id === id ? { ...c, selected: !c.selected } : c
            ),
          }
        }),

      setPublishStatus: (status) =>
        set((s) => {
          const existing = s.publishStatuses.findIndex(
            (p) => p.platform === status.platform && p.clipId === status.clipId
          )
          if (existing >= 0) {
            const updated = [...s.publishStatuses]
            updated[existing] = status
            return { publishStatuses: updated }
          }
          return { publishStatuses: [...s.publishStatuses, status] }
        }),

      setTextPosts: (posts) => set({ textPosts: posts }),
      updateTextPost: (platform, field, value) =>
        set((s) => {
          if (!s.textPosts) return s
          return {
            textPosts: {
              ...s.textPosts,
              [platform]: { ...s.textPosts[platform], [field]: value },
            },
          }
        }),

      addPublishedLink: (platform, link) =>
        set((s) => {
          const current = s.publishedLinks[platform]
          if (Array.isArray(current)) {
            return { publishedLinks: { ...s.publishedLinks, [platform]: [...current, link] } }
          }
          return { publishedLinks: { ...s.publishedLinks, [platform]: link } }
        }),
      setPublishedLinks: (links) =>
        set((s) => ({ publishedLinks: { ...s.publishedLinks, ...links } })),

      updateSettings: (settings) =>
        set((s) => ({ settings: { ...s.settings, ...settings } })),
      setSettingsOpen: (open) => set({ settingsOpen: open }),

      reset: () =>
        set({
          currentStep: 1,
          videoFile: null,
          videoUrl: null,
          analysisResult: null,
          thumbnailUrl: null,
          youtubeVideoId: null,
          youtubeLink: null,
          shortClips: [],
          publishStatuses: [],
          textPosts: null,
          publishedLinks: initialPublishedLinks,
        }),
    }),
    {
      name: 'clipflow-state',
      partialize: (state) => ({
        currentStep: state.currentStep,
        videoFile: state.videoFile,
        videoUrl: state.videoUrl,
        analysisResult: state.analysisResult,
        thumbnailUrl: state.thumbnailUrl,
        youtubeVideoId: state.youtubeVideoId,
        youtubeLink: state.youtubeLink,
        shortClips: state.shortClips,
        textPosts: state.textPosts,
        publishedLinks: state.publishedLinks,
        settings: state.settings,
      }),
      // Merge stored settings with DEFAULT_SETTINGS so new fields always appear
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        settings: { ...DEFAULT_SETTINGS, ...persisted?.settings },
      }),
    }
  )
)
