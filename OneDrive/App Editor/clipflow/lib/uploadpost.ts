const UPLOADPOST_BASE = 'https://api.upload-post.com'

const PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  youtubeShorts: 'youtube',
  instagramReels: 'instagram',
  tiktok: 'tiktok',
  reddit: 'reddit',
  linkedin: 'linkedin',
}

interface UploadVideoParams {
  apiKey: string
  user: string
  platform: string
  videoPath: string
  title: string
  description: string
  hashtags?: string[]
  subreddit?: string
  thumbnailUrl?: string
  privacyStatus?: string
  retries?: number
}

interface PublishTextParams {
  apiKey: string
  user: string
  platform: 'reddit' | 'linkedin'
  title?: string
  body: string
  subreddit?: string
  hook?: string
  retries?: number
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw new Error('Exhausted retries')
}

export async function uploadVideoPost({
  apiKey,
  user,
  platform,
  videoPath,
  title,
  description,
  hashtags = [],
  subreddit,
  thumbnailUrl,
  privacyStatus,
  retries = 3,
}: UploadVideoParams): Promise<{ link: string }> {
  const platformId = PLATFORM_MAP[platform] ?? platform

  return withRetry(async () => {
    const formData = new FormData()
    formData.append('user', user || 'default')
    formData.append('platform[]', platformId)
    formData.append('video', videoPath)
    formData.append('title', title)
    formData.append(
      'description',
      hashtags.length > 0
        ? `${description}\n\n${hashtags.map((h) => `#${h}`).join(' ')}`
        : description
    )
    if (subreddit) formData.append('subreddit', subreddit)
    if (thumbnailUrl) formData.append('thumbnail_url', thumbnailUrl)
    if (privacyStatus) formData.append('privacyStatus', privacyStatus)

    const res = await fetch(`${UPLOADPOST_BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Apikey ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `UploadPost error: ${res.status}`)
    }

    const data = await res.json()
    const link = data.url ?? data.link ?? data.post_url ?? ''
    return { link }
  }, retries)
}

export async function publishTextPost({
  apiKey,
  user,
  platform,
  title,
  body,
  subreddit,
  hook,
  retries = 3,
}: PublishTextParams): Promise<{ link: string }> {
  return withRetry(async () => {
    const formData = new FormData()
    formData.append('user', user || 'default')
    formData.append('platform[]', platform)
    formData.append('title', platform === 'linkedin' ? `${hook ?? ''}\n\n${body}` : (title ?? body))
    if (platform === 'reddit') formData.append('body', body)
    if (platform === 'reddit' && subreddit) formData.append('subreddit', subreddit)

    const res = await fetch(`${UPLOADPOST_BASE}/api/upload_text`, {
      method: 'POST',
      headers: { Authorization: `Apikey ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `UploadPost error: ${res.status}`)
    }

    const data = await res.json()
    return { link: data.url ?? data.link ?? data.post_url ?? '' }
  }, retries)
}
