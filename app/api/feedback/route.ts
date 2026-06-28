import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userToken, planId, content } = await req.json() as {
      userToken: string
      planId?: string
      content: string
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }

    if (!supabase) return NextResponse.json({ ok: true })

    const { error } = await supabase.from('feedback').insert({
      user_token: userToken,
      plan_id: planId && !planId.startsWith('local-') ? planId : null,
      content: content.trim(),
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[feedback POST]', err)
    return NextResponse.json({ error: 'Submit failed' }, { status: 500 })
  }
}
