import { NextRequest, NextResponse } from 'next/server'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const label = formData.get('label') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!supabase) {
      // Return base64 data URL so AI can still receive the image
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      return NextResponse.json({ url: dataUrl })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${label || 'image'}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) throw error

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
