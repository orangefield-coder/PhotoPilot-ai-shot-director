import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Plan } from '@/lib/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { plan } = await req.json() as { plan: Plan }

    if (!supabase || id.startsWith('local-')) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase
      .from('plans')
      .update({ plan_json: plan })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plans PATCH]', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!supabase || id.startsWith('local-')) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase
      .from('plans')
      .update({ status: 'deleted' })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plans DELETE]', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
