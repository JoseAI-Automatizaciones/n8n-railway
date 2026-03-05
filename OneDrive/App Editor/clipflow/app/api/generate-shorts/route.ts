import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/anthropic'
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

    const claudeKey = apiKey || process.env.ANTHROPIC_API_KEY
    if (!videoPath || !claudeKey) {
      return NextResponse.json({ error: 'Video path and API key required' }, { status: 400 })
    }

    const durationNote = videoDuration
      ? `El video tiene exactamente ${Math.floor(videoDuration)} segundos (${Math.floor(videoDuration / 60)} minutos). TODOS los timestamps DEBEN estar entre 0 y ${Math.floor(videoDuration)}. NO generes timestamps fuera de este límite.`
      : 'Usa los timestamps de la transcripción para inferir la duración y elige tiempos precisos.'

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

    const segments = await callClaudeJSON<ViralSegment[]>({
      apiKey: claudeKey,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Transcripción:\n${transcript?.slice(0, 8000) ?? 'No disponible'}\n\nDescripción visual:\n${visualDescription?.slice(0, 4000) ?? 'No disponible'}`,
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
