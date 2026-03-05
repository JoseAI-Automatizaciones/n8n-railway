export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface VideoFile {
  name: string
  size: number
  type: string
  tempPath?: string
  driveUrl?: string
}

export interface AnalysisResult {
  title: string
  description: string
  thumbnailPrompt: string
  transcript: string
  visualDescription: string
  timestamps: Array<{ time: number; description: string }>
}

export interface ShortClip {
  id: string
  index: number
  startTime: number
  endTime: number
  title: string
  description: string
  hashtags: string[]
  clipPath?: string
  clipUrl?: string
  selected: boolean
}

export interface PublishedShort {
  clipId: string
  clipTitle: string
  youtubeShorts?: string
  instagramReels?: string
  tiktok?: string
}

export interface TextPost {
  reddit: {
    subreddit: string
    title: string
    body: string
  }
  linkedin: {
    hook: string
    body: string
  }
}

export interface PublishedLinks {
  youtube?: string
  youtubeShorts: string[]
  instagramReels: string[]
  tiktok: string[]
  reddit?: string
  linkedin?: string
}

export interface Settings {
  // API Keys
  anthropicApiKey: string
  assemblyAiKey: string
  kieaiApiKey: string
  uploadpostApiKey: string
  uploadpostUser: string
  resendApiKey: string
  // Publishing preferences
  emailDestination: string
  youtubePrivacyStatus: 'public' | 'unlisted' | 'private'
  defaultSubreddit: string
  frameAnalysisInterval: number
  // Camera overlay config
  cameraOverlayX: number
  cameraOverlayY: number
  cameraOverlayWidth: number
  cameraOverlayHeight: number
}

export const DEFAULT_SETTINGS: Settings = {
  anthropicApiKey: '',
  assemblyAiKey: '',
  kieaiApiKey: '',
  uploadpostApiKey: '',
  uploadpostUser: '',
  resendApiKey: '',
  emailDestination: '',
  youtubePrivacyStatus: 'public',
  defaultSubreddit: 'programming',
  frameAnalysisInterval: 5,
  cameraOverlayX: 1440,
  cameraOverlayY: 810,
  cameraOverlayWidth: 480,
  cameraOverlayHeight: 270,
}

export interface PublishStatus {
  platform: string
  clipId: string
  status: 'pending' | 'processing' | 'uploading' | 'done' | 'error'
  link?: string
  error?: string
}
