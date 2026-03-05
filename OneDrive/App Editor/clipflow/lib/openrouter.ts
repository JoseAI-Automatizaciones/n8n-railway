const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

export async function callOpenRouter({
  apiKey,
  model = 'google/gemini-2.5-pro',
  messages,
  maxTokens = 4096,
  temperature = 0.7,
}: {
  apiKey: string
  model?: string
  messages: OpenRouterMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clipflow.app',
      'X-Title': 'ClipFlow',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    // Fallback to flash on Pro failure
    if (model === 'google/gemini-2.5-pro') {
      return callOpenRouter({ apiKey, model: 'google/gemini-2.5-flash', messages, maxTokens, temperature })
    }
    throw new Error(err.error?.message ?? 'OpenRouter request failed')
  }

  const data = await res.json()

  // Handle cases where the API returns 200 but with an error payload or empty choices
  if (data.error) {
    const errMsg = data.error.message ?? JSON.stringify(data.error)
    // Fallback to Flash when Pro hits billing/rate limits
    if (model === 'google/gemini-2.5-pro' && (errMsg.toLowerCase().includes('credit') || errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('quota'))) {
      return callOpenRouter({ apiKey, model: 'google/gemini-2.5-flash', messages, maxTokens, temperature })
    }
    throw new Error(errMsg)
  }
  if (!data.choices?.length) {
    throw new Error(`No response from model. Raw: ${JSON.stringify(data).slice(0, 200)}`)
  }

  return data.choices[0].message.content as string
}

export async function callOpenRouterJSON<T>(params: Parameters<typeof callOpenRouter>[0]): Promise<T> {
  const text = await callOpenRouter(params)
  if (!text?.trim()) {
    throw new Error('Model returned an empty response. The video may be too large or unsupported.')
  }
  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
  const raw = jsonMatch[1]?.trim() ?? ''
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Model response is not valid JSON. First 300 chars: ${raw.slice(0, 300)}`)
  }
}
