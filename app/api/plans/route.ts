import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Plan } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userToken, selfieUrl, sceneUrl, shotType, plan } = body as {
      userToken: string
      selfieUrl: string
      sceneUrl: string
      shotType: string
      plan: Plan
    }

    if (!supabase) {
      // No Supabase configured — return a fake ID, client stores in localStorage
      return NextResponse.json({ id: `local-${Date.now()}`, plan })
    }

    const { data, error } = await supabase
      .from('plans')
      .insert({
        user_token: userToken,
        selfie_url: selfieUrl,
        scene_url: sceneUrl,
        shot_type: shotType,
        plan_json: plan,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[plans POST]', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userToken = req.nextUrl.searchParams.get('userToken')
    const id = req.nextUrl.searchParams.get('id')

    if (!supabase) return NextResponse.json(id ? null : [])

    // Single plan by ID
    if (id) {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    // List plans by userToken
    if (!userToken) return NextResponse.json([], { status: 200 })

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_token', userToken)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    console.error('[plans GET]', err)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
