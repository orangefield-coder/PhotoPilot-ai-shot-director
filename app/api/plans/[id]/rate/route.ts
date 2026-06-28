import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { rating } = await req.json() as { rating: 1 | -1 }

    if (!supabase) return NextResponse.json({ ok: true })

    const { error } = await supabase
      .from('plans')
      .update({ rating })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plans rate]', err)
    return NextResponse.json({ error: 'Rate failed' }, { status: 500 })
  }
}
