import { NextRequest, NextResponse } from 'next/server'
import { callOpenRouterJSON } from '@/lib/openrouter'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 120

interface ViralSegment {
  startTime: number
  endTime: number
  title: string
  description: string
  hashtags: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { videoPath, transcript, visualDescription, apiKey, videoDuration } = await req.json()

    if (!videoPath || !apiKey) {
      return NextResponse.json({ error: 'Video path and API key required' }, { status: 400 })
    }

    const durationNote = videoDuration
      ? `The video is exactly ${Math.floor(videoDuration)} seconds (${Math.floor(videoDuration / 60)} minutes) long. ALL timestamps MUST be between 0 and ${Math.floor(videoDuration)}. Do NOT generate timestamps beyond this limit.`
      : 'Use transcript timestamps to infer video duration and pick accurate start/end times.'

    // Ask Gemini to identify 6 viral segments based on transcript + visual description
    const systemPrompt = `Eres un experto en contenido viral para video de formato corto. Analiza la transcripción y descripción visual del video e identifica los 6 segmentos más virales o valiosos.

Requisitos para cada segmento:
- Duración: entre 45 y 90 segundos
- Prioriza: ganchos fuertes, revelaciones, demostraciones, energía atractiva
- Distribuye los segmentos a lo largo del video (no los agrupes)
- El título y la descripción deben estar EN ESPAÑOL
- ${durationNote}

Devuelve un array JSON de exactamente 6 objetos:
[
  {
    "startTime": 0,
    "endTime": 75,
    "title": "Título gancho corto, máximo 60 caracteres, en español",
    "description": "Descripción para la plataforma, 150-200 caracteres, en español",
    "hashtags": ["tag1", "tag2", "tag3"]
  }
]
Devuelve ÚNICAMENTE JSON válido.`

    const segments = await callOpenRouterJSON<ViralSegment[]>({
      apiKey,
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Transcript:\n${transcript?.slice(0, 8000) ?? 'No transcript available'}\n\nVisual description:\n${visualDescription?.slice(0, 4000) ?? 'Not available'}`,
        },
      ],
    })

    const maxTime = videoDuration ? Math.floor(videoDuration) : Infinity

    const clips = segments.slice(0, 6).map((seg, i) => {
      const start = Math.max(0, Math.min(seg.startTime, maxTime - 45))
      const end = Math.min(Math.max(start + 45, seg.endTime), maxTime)
      return {
        id: uuidv4(),
        index: i,
        startTime: start,
        endTime: end,
        title: seg.title,
        description: seg.description,
        hashtags: seg.hashtags ?? [],
        clipUrl: null,
        selected: false,
      }
    })

    return NextResponse.json({ clips })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
