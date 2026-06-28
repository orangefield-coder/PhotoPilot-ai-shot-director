const API_KEY = process.env.VLM_API_KEY || process.env.DASHSCOPE_API_KEY || ''
const BASE_URL = process.env.VLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
export const QWEN_MODEL = process.env.VLM_MODEL || 'doubao-seed-2-1-pro-260628'

type ContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

export async function chatComplete(messages: Message[]): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180000)

  console.log('[qwen] calling', `${BASE_URL}/responses`, 'model:', QWEN_MODEL)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: QWEN_MODEL, input: messages }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status} ${err}`)
  }

  const data = await res.json()
  console.log('[qwen] raw response keys:', Object.keys(data))
  const message = data.output?.find((o: { type: string }) => o.type === 'message')
  return message?.content?.[0]?.text || ''
}
