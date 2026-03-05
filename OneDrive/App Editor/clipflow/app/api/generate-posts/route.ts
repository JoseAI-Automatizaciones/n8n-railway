import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/anthropic'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const {
      transcript,
      visualDescription,
      youtubeTitle,
      youtubeDescription,
      youtubeLink,
      defaultSubreddit,
      apiKey,
    } = await req.json()

    const claudeKey = apiKey || process.env.ANTHROPIC_API_KEY
    if (!claudeKey) return NextResponse.json({ error: 'Anthropic API key required' }, { status: 400 })

    const systemPrompt = `Eres un experto en estrategia de contenido para redes sociales. Basándote en la información del video, genera posts nativos para Reddit y LinkedIn COMPLETAMENTE EN ESPAÑOL.

Requisitos Reddit:
- Título: conversacional, genera curiosidad, estilo nativo Reddit (sin clickbait, máximo 300 caracteres)
- Cuerpo: explica el contexto, aprendizajes clave del video, invita a la discusión. Al final del cuerpo añade el link de YouTube que te proporciono.
- Subreddit: sugiere uno relevante al tema del video

Requisitos LinkedIn:
- Hook: primera línea impactante que detenga el scroll (máximo 150 caracteres)
- Cuerpo: storytelling profesional, párrafos cortos, emojis estratégicos, insights clave del video. Al final incluye exactamente esta línea: "🎬 Video completo: [YOUTUBE_LINK]" (reemplaza [YOUTUBE_LINK] con el link real que te proporciono).

IMPORTANTE: Todo el contenido debe estar en español. Incluye siempre el link de YouTube al final de cada post.

Devuelve JSON:
{
  "reddit": {
    "subreddit": "...",
    "title": "...",
    "body": "..."
  },
  "linkedin": {
    "hook": "...",
    "body": "..."
  }
}
Devuelve ÚNICAMENTE JSON válido.`

    const result = await callClaudeJSON({
      apiKey: claudeKey,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Título del video: ${youtubeTitle}\nLink de YouTube: ${youtubeLink ?? 'N/A'}\nSubreddit sugerido: ${defaultSubreddit}\n\nTranscripción:\n${transcript?.slice(0, 6000) ?? 'N/A'}\n\nDescripción del video:\n${youtubeDescription?.slice(0, 2000) ?? 'N/A'}`,
        },
      ],
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
