import { NextRequest, NextResponse } from 'next/server'
import { chatComplete } from '@/lib/qwen'
import { buildPlannerPrompt } from '@/lib/prompts'
import { PlanSchema, parseJSON } from '@/lib/schemas'
import { SceneProfile } from '@/lib/types'

async function callGenerate(profile: SceneProfile, shotType: string, emotion: string, visualStyle?: string) {
  const prompt = buildPlannerPrompt(
    JSON.stringify(profile.person),
    JSON.stringify(profile.scene),
    shotType,
    emotion,
    visualStyle
  )

  const text = await chatComplete([{ role: 'user', content: prompt }])
  return parseJSON(text, PlanSchema)
}

export async function POST(req: NextRequest) {
  try {
    const { profile, shotType, visualStyle, emotion = '' } = await req.json()

    if (!profile || !shotType) {
      return NextResponse.json({ error: 'profile and shotType are required' }, { status: 400 })
    }

    console.log('[generate] shotType:', shotType, 'visualStyle:', visualStyle, 'emotion:', emotion)

    let plan
    try {
      plan = await callGenerate(profile, shotType, emotion, visualStyle)
    } catch {
      plan = await callGenerate(profile, shotType, emotion, visualStyle)
    }

    console.log('[generate] result:', JSON.stringify(plan, null, 2))

    const aiKeywords: string[] = (plan as { xhs_keywords?: string[] }).xhs_keywords ?? []
    const result = { ...plan, xhsKeyword: aiKeywords[0] || shotType }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })
  }
}
