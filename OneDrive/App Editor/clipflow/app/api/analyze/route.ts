import { NextRequest, NextResponse } from 'next/server'
import { callOpenRouterJSON } from '@/lib/openrouter'

export const maxDuration = 300

interface AnalysisResult {
  title: string
  description: string
  thumbnailPrompt: string
  transcript: string
  visualDescription: string
  timestamps: Array<{ time: number; description: string }>
}

function getMimeType(url: string): string {
  if (url.includes('.mov')) return 'video/quicktime'
  if (url.includes('.mkv')) return 'video/x-matroska'
  if (url.includes('.webm')) return 'video/webm'
  return 'video/mp4'
}

function parseGeminiJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
  const raw = jsonMatch[1]?.trim() ?? ''
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Gemini response is not valid JSON. First 300 chars: ${raw.slice(0, 300)}`)
  }
}

async function analyzeWithGoogleAI(
  videoUrl: string,
  googleAiKey: string,
  frameInterval: number,
  systemPrompt: string
): Promise<AnalysisResult> {
  const BASE = 'https://generativelanguage.googleapis.com'
  const mimeType = getMimeType(videoUrl)

  // 1. Download video from Vercel Blob
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`)
  const contentLength = videoRes.headers.get('content-length') ?? '0'

  // 2. Initiate resumable upload to Google Files API
  const initRes = await fetch(`${BASE}/upload/v1beta/files?key=${googleAiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': contentLength,
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'clipflow_video' } }),
  })

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Google Files API init failed: ${initRes.status}`)
  }

  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('No upload URL from Google Files API')

  // 3. Stream video directly to Google (avoids buffering large video in memory)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': contentLength,
      'Content-Type': mimeType,
    },
    body: videoRes.body,
    duplex: 'half',
  } as any)

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Google Files upload failed: ${uploadRes.status}`)
  }

  const fileData = await uploadRes.json()
  const fileUri: string = fileData.file?.uri
  const fileName: string = fileData.file?.name

  if (!fileUri || !fileName) throw new Error('No file URI from Google Files API')

  // 4. Poll until file is ACTIVE (Google processes video before it can be analyzed)
  let state: string = fileData.file?.state ?? 'PROCESSING'
  let attempts = 0
  while (state === 'PROCESSING' && attempts < 30) {
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await fetch(`${BASE}/v1beta/${fileName}?key=${googleAiKey}`)
    const statusData = await statusRes.json()
    state = statusData.state ?? 'PROCESSING'
    attempts++
    if (state === 'FAILED') throw new Error('Google video processing failed')
  }
  if (state !== 'ACTIVE') throw new Error(`File did not become active (state: ${state})`)

  // 5. Call Gemini 2.5 Pro with the uploaded file reference
  const genRes = await fetch(`${BASE}/v1beta/models/gemini-2.5-pro:generateContent?key=${googleAiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Analyze this complete video, covering every ${frameInterval} seconds throughout the full duration:` },
            { file_data: { mime_type: mimeType, file_uri: fileUri } },
          ],
        },
      ],
      generation_config: { max_output_tokens: 16000, temperature: 0.7 },
    }),
  })

  // Fire-and-forget cleanup
  fetch(`${BASE}/v1beta/${fileName}?key=${googleAiKey}`, { method: 'DELETE' }).catch(() => {})

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Gemini API error: ${genRes.status}`)
  }

  const genData = await genRes.json()
  const text: string = genData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(`No response from Gemini. Raw: ${JSON.stringify(genData).slice(0, 200)}`)

  return parseGeminiJSON<AnalysisResult>(text)
}

export async function POST(req: NextRequest) {
  try {
    const { videoPath, apiKey, googleAiKey, frameInterval = 5, regenerate, existing } = await req.json()

    if (!apiKey && !googleAiKey) {
      return NextResponse.json({ error: 'API key required (OpenRouter or Google AI)' }, { status: 400 })
    }

    // Regeneration of a single field — uses OpenRouter (no video needed)
    if (regenerate && existing) {
      const fieldMap: Record<string, string> = {
        title: 'Regenerate an improved YouTube title (max 70 chars, keyword-rich, engaging).',
        description: 'Regenerate an improved YouTube description (SEO optimized, with timestamps, CTA, hashtags).',
        thumbnailPrompt: 'Regenerate an improved thumbnail prompt for kie.ai Nano Banana 2 (detailed visual composition, colors, text overlay, professional YouTube thumbnail style).',
      }
      const result = await callOpenRouterJSON<Record<string, string>>({
        apiKey,
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: 'You are a YouTube content optimization expert. Return valid JSON only.' },
          {
            role: 'user',
            content: `Based on this video context:\nTitle: ${existing.title}\nTranscript excerpt: ${existing.transcript?.slice(0, 1000)}\n\n${fieldMap[regenerate]}\n\nReturn JSON: {"${regenerate}": "..."}`,
          },
        ],
      })
      return NextResponse.json(result)
    }

    if (!videoPath) return NextResponse.json({ error: 'Video path required' }, { status: 400 })

    const systemPrompt = `You are an expert YouTube content strategist and AI video analyst. Analyze the provided video and return a JSON object with these exact fields:
{
  "title": "engaging YouTube title, max 70 chars",
  "description": "full YouTube description with intro, timestamps, CTA, and hashtags",
  "thumbnailPrompt": "detailed prompt for AI thumbnail generation (composition, colors, text overlay, style)",
  "transcript": "full audio transcription with timestamps in format [0:00] text",
  "visualDescription": "description of what's visually shown every ${frameInterval} seconds",
  "timestamps": [{"time": 0, "description": "..."}]
}
Return ONLY valid JSON.`

    // Google AI File API — handles large videos (any size, streams upload)
    if (googleAiKey && videoPath.startsWith('http')) {
      const result = await analyzeWithGoogleAI(videoPath, googleAiKey, frameInterval, systemPrompt)
      return NextResponse.json(result)
    }

    // Fallback: OpenRouter + Gemini via image_url (works for small videos / base64)
    let userContent: any

    if (!videoPath.startsWith('http')) {
      // Local file — send as base64 if small
      const fs = await import('fs')
      if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath)
        if (stats.size < 50 * 1024 * 1024) {
          const b64 = fs.readFileSync(videoPath).toString('base64')
          userContent = [
            { type: 'text', text: `Analyze this video completely. Cover all ${frameInterval}s intervals:` },
            { type: 'image_url', image_url: { url: `data:video/mp4;base64,${b64}` } },
          ]
        }
      }
    }

    if (!userContent) {
      userContent = [
        { type: 'text', text: `Analyze this video completely, covering every ${frameInterval} seconds throughout the FULL duration:` },
        { type: 'image_url', image_url: { url: videoPath } },
      ]
    }

    const result = await callOpenRouterJSON<AnalysisResult>({
      apiKey,
      maxTokens: 16000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
