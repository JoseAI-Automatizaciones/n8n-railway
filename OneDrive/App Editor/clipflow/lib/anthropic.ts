const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'

export async function callClaude({
  apiKey,
  model = 'claude-sonnet-4-5',
  system,
  messages,
  maxTokens = 4096,
}: {
  apiKey: string
  model?: string
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
}): Promise<string> {
  const body: Record<string, any> = {
    model,
    max_tokens: maxTokens,
    messages,
  }
  if (system) body.system = system

  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Anthropic API error: ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function callClaudeJSON<T>(params: Parameters<typeof callClaude>[0]): Promise<T> {
  const text = await callClaude(params)
  if (!text?.trim()) {
    throw new Error('Claude returned an empty response.')
  }
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
  const raw = (jsonMatch[1] ?? text).trim()
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Claude response is not valid JSON. First 300 chars: ${raw.slice(0, 300)}`)
  }
}
