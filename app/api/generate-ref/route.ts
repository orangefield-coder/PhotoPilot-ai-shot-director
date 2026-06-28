import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.VLM_API_KEY || ''
const BASE_URL = process.env.VLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
const REWRITE_MODEL = 'doubao-seed-2-0-mini-260428'
const IMAGE_MODEL = 'doubao-seedream-4-0-250828'

interface RefInput {
  scene_prompt: string
  behavior: string
  lighting: string
  composition: string
  angle: string
  person?: { clothing: string; style: string; color_palette: string }
  scene?: { type: string; atmosphere?: string; elements: string[] }
  extra?: string
}

async function rewritePrompt(input: RefInput): Promise<string> {
  const personLine = input.person
    ? `\n人物信息：穿搭 ${input.person.clothing}，风格 ${input.person.style}，色调 ${input.person.color_palette}`
    : ''
  const sceneLine = input.scene
    ? `\n场景信息：${input.scene.type}${input.scene.atmosphere ? '，' + input.scene.atmosphere : ''}，元素：${input.scene.elements.join('、')}`
    : ''

  const userMsg = `你是专业摄影参考图的 prompt 设计师。请根据以下摄影策划内容，生成一段照相指引prompt，生成拍摄镜头示意图。

摄影策划信息：${personLine}${sceneLine}
景别：${input.composition}
拍摄角度：${input.angle}
情境：${input.scene_prompt}
行为引导：${input.behavior}
用光：${input.lighting}

要求：
根据给定的人物信息、场景信息和摄影策划信息，非常简洁、准确地描述摄影镜头画面，包括人物穿搭、动作、道具、场景等。简洁，不超过50字，不要解释。

例如：
水手服少女，俯拍，特写，伦勃朗光，在书房看书突然抬眼
方圆脸男孩，平拍，特写，侧逆光，拿着一串葡萄，向上看

只输出 prompt，不要加任何前缀或解释。`

  const res = await fetch(`${BASE_URL}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: REWRITE_MODEL,
      input: [{ role: 'user', content: [{ type: 'input_text', text: userMsg }] }],
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`rewrite ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const message = data.output?.find((o: { type: string }) => o.type === 'message')
  return message?.content?.[0]?.text?.trim() || ''
}

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '1K',
      stream: false,
      watermark: false,
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`image gen ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('no image url in response')
  return url
}

export async function POST(req: NextRequest) {
  try {
    const body: RefInput & { planId: string; shotId: number } = await req.json()
    const { extra, planId, shotId, ...fields } = body

    console.log('[generate-ref] person:', JSON.stringify(fields.person), 'scene:', JSON.stringify(fields.scene))
    const finalPrompt = extra?.trim() || await rewritePrompt(fields)
    console.log('[generate-ref] prompt:', finalPrompt)

    const tempUrl = await generateImage(finalPrompt)

    return NextResponse.json({ imageUrl: tempUrl, prompt: finalPrompt })
  } catch (err) {
    console.error('[generate-ref]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

