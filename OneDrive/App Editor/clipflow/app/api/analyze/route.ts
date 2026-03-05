import { NextRequest, NextResponse } from 'next/server'
import { callOpenRouter, callOpenRouterJSON } from '@/lib/openrouter'

export const maxDuration = 300

interface AnalysisResult {
  title: string
  description: string
  thumbnailPrompt: string
  transcript: string
  visualDescription: string
  timestamps: Array<{ time: number; description: string }>
}

interface AssemblyWord {
  text: string
  start: number
  end: number
}

interface AssemblyChapter {
  gist: string
  headline: string
  start: number
  end: number
}

async function transcribeWithAssemblyAI(
  audioUrl: string,
  apiKey: string
): Promise<{ text: string; words: AssemblyWord[]; chapters: AssemblyChapter[] }> {
  const BASE = 'https://api.assemblyai.com/v2'

  const submitRes = await fetch(`${BASE}/transcript`, {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_detection: true,
      auto_chapters: true,
    }),
  })

  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}))
    throw new Error(err.error ?? `AssemblyAI submit failed: ${submitRes.status}`)
  }

  const { id } = await submitRes.json()

  // Poll until completed (max 25 attempts × 10s = 250s)
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 10000))
    const statusRes = await fetch(`${BASE}/transcript/${id}`, {
      headers: { Authorization: apiKey },
    })
    const data = await statusRes.json()

    if (data.status === 'completed') {
      return { text: data.text ?? '', words: data.words ?? [], chapters: data.chapters ?? [] }
    }
    if (data.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${data.error}`)
    }
  }

  throw new Error('AssemblyAI transcription timed out after 250 seconds')
}

function buildFormattedTranscript(text: string, words: AssemblyWord[]): string {
  if (!words.length) return text

  const segments: string[] = []
  let segmentWords: string[] = []
  let segmentStart = words[0].start
  let lastSegmentTime = words[0].start

  for (const word of words) {
    if (word.start - lastSegmentTime >= 60000 && segmentWords.length > 0) {
      const secs = Math.floor(segmentStart / 1000)
      const m = Math.floor(secs / 60)
      const s = (secs % 60).toString().padStart(2, '0')
      segments.push(`[${m}:${s}] ${segmentWords.join(' ')}`)
      segmentWords = [word.text]
      segmentStart = word.start
      lastSegmentTime = word.start
    } else {
      segmentWords.push(word.text)
    }
  }

  if (segmentWords.length) {
    const secs = Math.floor(segmentStart / 1000)
    const m = Math.floor(secs / 60)
    const s = (secs % 60).toString().padStart(2, '0')
    segments.push(`[${m}:${s}] ${segmentWords.join(' ')}`)
  }

  return segments.join('\n')
}

const SYSTEM_PROMPT = `Eres un experto en estrategia de contenido para YouTube. Basándote en la transcripción del video, genera un objeto JSON con estos campos EXACTAMENTE. El título, descripción, visualDescription y timestamps deben estar EN ESPAÑOL:
{
  "title": "título de YouTube atractivo, máximo 70 caracteres, en español",
  "description": "descripción completa de YouTube con intro, timestamps del contenido, llamada a la acción y hashtags, en español",
  "thumbnailPrompt": "detailed prompt in ENGLISH for AI thumbnail generation (visual composition, colors, text overlay, professional YouTube thumbnail style)",
  "visualDescription": "resumen de los principales temas y puntos clave tratados en el video, en español",
  "timestamps": [{"time": 0, "description": "descripción del segmento en español"}]
}
Devuelve ÚNICAMENTE JSON válido, sin markdown.`

const SYSTEM_PROMPT_MULTIMODAL = `Eres un experto en estrategia de contenido para YouTube. Analiza este video completo: escucha el audio, transcribe el contenido y genera un objeto JSON con estos campos EXACTAMENTE. Todo en ESPAÑOL excepto thumbnailPrompt:
{
  "title": "título de YouTube atractivo, máximo 70 caracteres, en español",
  "description": "descripción completa de YouTube con intro, timestamps del contenido, llamada a la acción y hashtags, en español",
  "thumbnailPrompt": "detailed prompt in ENGLISH for AI thumbnail generation (visual composition, colors, text overlay, professional YouTube thumbnail style)",
  "transcript": "transcripción completa del audio del video con timestamps en formato [M:SS] cada 60 segundos aproximadamente",
  "visualDescription": "resumen de los principales temas y puntos clave tratados en el video, en español",
  "timestamps": [{"time": 0, "description": "descripción del segmento en español"}]
}
Devuelve ÚNICAMENTE JSON válido, sin markdown.`

export async function POST(req: NextRequest) {
  try {
    const { videoPath, apiKey, assemblyAiKey, frameInterval = 5, regenerate, existing } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key required' }, { status: 400 })
    }

    // Regeneration of a single field — no video needed, uses existing transcript
    if (regenerate && existing) {
      const fieldMap: Record<string, string> = {
        title: 'Regenera un título de YouTube mejorado (máximo 70 caracteres, con palabras clave, atractivo). EN ESPAÑOL.',
        description: 'Regenera una descripción de YouTube mejorada (SEO optimizada, con timestamps, llamada a la acción, hashtags). EN ESPAÑOL.',
        thumbnailPrompt: 'Regenerate an improved thumbnail prompt for kie.ai Nano Banana 2 (detailed visual composition, colors, text overlay, professional YouTube thumbnail style). In ENGLISH.',
      }
      const result = await callOpenRouterJSON<Record<string, string>>({
        apiKey,
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: 'Eres un experto en optimización de contenido para YouTube. Devuelve ÚNICAMENTE JSON válido.' },
          {
            role: 'user',
            content: `Contexto del video:\nTítulo: ${existing.title}\nTranscripción: ${existing.transcript?.slice(0, 1500)}\n\n${fieldMap[regenerate]}\n\nDevuelve JSON: {"${regenerate}": "..."}`,
          },
        ],
      })
      return NextResponse.json(result)
    }

    if (!videoPath) return NextResponse.json({ error: 'Video path required' }, { status: 400 })

    // --- Path A: AssemblyAI transcription (preferred, more accurate) ---
    if (assemblyAiKey) {
      const { text: rawTranscript, words, chapters } = await transcribeWithAssemblyAI(videoPath, assemblyAiKey)
      const formattedTranscript = buildFormattedTranscript(rawTranscript, words)
      const chapterTimestamps = chapters.map((ch) => ({
        time: Math.floor(ch.start / 1000),
        description: ch.headline,
      }))

      const userContent = chapterTimestamps.length > 0
        ? `Transcripción del video:\n\n${rawTranscript}\n\nCapítulos detectados automáticamente:\n${chapters.map((ch) => `[${Math.floor(ch.start / 1000)}s] ${ch.headline}: ${ch.gist}`).join('\n')}\n\nGenera el análisis JSON completo en español.`
        : `Transcripción del video:\n\n${rawTranscript}\n\nGenera el análisis JSON completo en español.`

      const analysis = await callOpenRouterJSON<Omit<AnalysisResult, 'transcript'>>({
        apiKey,
        maxTokens: 8000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      })

      const result: AnalysisResult = {
        ...analysis,
        transcript: formattedTranscript || rawTranscript,
        timestamps: analysis.timestamps?.length ? analysis.timestamps : chapterTimestamps,
      }

      return NextResponse.json(result)
    }

    // --- Path B: Gemini multimodal fallback (no AssemblyAI key needed) ---
    // Gemini 2.5 Pro analyzes the video directly from its public URL
    const rawResponse = await callOpenRouter({
      apiKey,
      model: 'google/gemini-2.5-pro',
      maxTokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_MULTIMODAL },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analiza este video completo. Escucha el audio, transcríbelo y genera el análisis JSON completo en español.',
            },
            {
              type: 'image_url',
              image_url: { url: videoPath },
            },
          ] as any,
        },
      ],
    })

    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, rawResponse]
    const raw = (jsonMatch[1] ?? rawResponse).trim()
    const result = JSON.parse(raw) as AnalysisResult

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
