import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userToken, eventName, planId, shotId, properties } = await req.json() as {
      userToken: string
      eventName: string
      planId?: string
      shotId?: number
      properties?: Record<string, unknown>
    }

    if (!supabase) return NextResponse.json({ ok: true })

    const { error } = await supabase.from('events').insert({
      user_token: userToken,
      event_name: eventName,
      plan_id: planId && !planId.startsWith('local-') ? planId : null,
      shot_id: shotId ?? null,
      properties: properties ?? null,
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[events POST]', err)
    return NextResponse.json({ error: 'Track failed' }, { status: 500 })
  }
}
