import { NextRequest, NextResponse } from 'next/server'
import { qwenClient, QWEN_MODEL } from '@/lib/qwen'
import { SCENE_ANALYSIS_PROMPT } from '@/lib/prompts'
import { SceneProfileSchema, parseJSON } from '@/lib/schemas'

async function callAnalyze(selfieUrl: string, sceneUrl: string) {
  const messages: Parameters<typeof qwenClient.chat.completions.create>[0]['messages'] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: SCENE_ANALYSIS_PROMPT },
        { type: 'image_url', image_url: { url: selfieUrl } },
        { type: 'image_url', image_url: { url: sceneUrl } },
      ],
    },
  ]

  const response = await qwenClient.chat.completions.create({
    model: QWEN_MODEL,
    messages,
  })

  const text = response.choices[0]?.message?.content || ''
  return parseJSON(text, SceneProfileSchema)
}

export async function POST(req: NextRequest) {
  try {
    const { selfieUrl, sceneUrl } = await req.json()

    if (!selfieUrl || !sceneUrl) {
      return NextResponse.json({ error: 'selfieUrl and sceneUrl are required' }, { status: 400 })
    }

    console.log('[analyze] selfieUrl:', selfieUrl)
    console.log('[analyze] sceneUrl:', sceneUrl)

    let profile
    try {
      profile = await callAnalyze(selfieUrl, sceneUrl)
    } catch {
      // retry once
      profile = await callAnalyze(selfieUrl, sceneUrl)
    }

    console.log('[analyze] result:', JSON.stringify(profile, null, 2))
    return NextResponse.json(profile)
  } catch (err) {
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
