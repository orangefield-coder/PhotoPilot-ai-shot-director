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
  ], false)
  return parseJSON(text, SceneProfileSchema)
}

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { selfieUrl, sceneUrl } = await req.json()

    if (!selfieUrl || !sceneUrl) {
      return NextResponse.json({ error: 'selfieUrl and sceneUrl are required' }, { status: 400 })
    }

    console.log('[analyze] start')

    let profile
    try {
      profile = await callAnalyze(selfieUrl, sceneUrl)
    } catch {
      profile = await callAnalyze(selfieUrl, sceneUrl)
    }

    console.log(`[analyze] ✓ total ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    return NextResponse.json(profile)
  } catch (err) {
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
