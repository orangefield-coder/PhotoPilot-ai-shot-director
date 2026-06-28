import { NextRequest, NextResponse } from 'next/server'
import { chatComplete } from '@/lib/qwen'
import { SCENE_ANALYSIS_PROMPT } from '@/lib/prompts'
import { SceneProfileSchema, parseJSON } from '@/lib/schemas'

async function callAnalyze(selfieUrl: string, sceneUrl: string) {
  const text = await chatComplete([
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: selfieUrl },
        { type: 'input_image', image_url: sceneUrl },
        { type: 'input_text', text: SCENE_ANALYSIS_PROMPT },
      ],
    },
  ])
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
      profile = await callAnalyze(selfieUrl, sceneUrl)
    }

    console.log('[analyze] result:', JSON.stringify(profile, null, 2))
    return NextResponse.json(profile)
  } catch (err) {
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
