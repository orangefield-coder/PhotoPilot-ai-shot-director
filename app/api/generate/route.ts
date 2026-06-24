import { NextRequest, NextResponse } from 'next/server'
import { qwenClient, QWEN_MODEL } from '@/lib/qwen'
import { buildPlannerPrompt } from '@/lib/prompts'
import { PlanSchema, parseJSON } from '@/lib/schemas'
import { SceneProfile } from '@/lib/types'

async function callGenerate(profile: SceneProfile, shotType: string) {
  const prompt = buildPlannerPrompt(
    JSON.stringify(profile.person),
    JSON.stringify(profile.scene),
    shotType
  )

  const response = await qwenClient.chat.completions.create({
    model: QWEN_MODEL,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content || ''
  return parseJSON(text, PlanSchema)
}

export async function POST(req: NextRequest) {
  try {
    const { profile, shotType } = await req.json()

    if (!profile || !shotType) {
      return NextResponse.json({ error: 'profile and shotType are required' }, { status: 400 })
    }

    console.log('[generate] shotType:', shotType)
    console.log('[generate] profile:', JSON.stringify(profile, null, 2))

    let plan
    try {
      plan = await callGenerate(profile, shotType)
    } catch {
      // retry once
      plan = await callGenerate(profile, shotType)
    }

    console.log('[generate] result:', JSON.stringify(plan, null, 2))
    return NextResponse.json(plan)
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })
  }
}
