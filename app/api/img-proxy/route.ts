import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('missing url', { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.xiaohongshu.com/',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      cache: 'force-cache',
    })
    if (!res.ok) return new NextResponse('fetch failed', { status: res.status })

    const blob = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('proxy error', { status: 500 })
  }
}
