import { NextRequest, NextResponse } from 'next/server'

const EXCLUDE_KEYWORDS = ['自拍', '日常vlog', 'vlog', '护肤', '穿搭', '测评', '好物', '开箱']

const PHOTOGRAPHY_TAGS = ['摄影', '拍照', 'photography', 'photo']

async function searchByKeyword(keyword: string, apiKey: string) {
  const res = await fetch('https://redfox.hk/story/api/xhsUser/searchArticle', {
    method: 'POST',
    headers: { 'REDFOX_API_KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, offset: 0, sortType: 'comprehensive' }),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json?.data?.list ?? []) as Record<string, unknown>[]
}

function hasPhotographyTag(item: Record<string, unknown>): boolean {
  // Check dedicated tag fields if they exist
  const tags = (item.tags as string[]) ?? (item.tagList as string[]) ?? []
  if (tags.length > 0) {
    return tags.some((tag) =>
      PHOTOGRAPHY_TAGS.some((pt) => tag.toLowerCase().includes(pt.toLowerCase()))
    )
  }
  // Fallback: extract #tags from workDesc
  const desc = ((item.workDesc as string) || '')
  const hashTags = desc.match(/#([^\s#]+)/g)?.map((t) => t.slice(1)) ?? []
  if (hashTags.length > 0) {
    return hashTags.some((tag) =>
      PHOTOGRAPHY_TAGS.some((pt) => tag.toLowerCase().includes(pt.toLowerCase()))
    )
  }
  // No tags found — don't filter out, let keyword exclusion handle it
  return true
}

function isPhotographyWork(item: Record<string, unknown>): boolean {
  const desc = ((item.workDesc as string) || '').toLowerCase()
  if (EXCLUDE_KEYWORDS.some((kw) => desc.includes(kw))) return false
  return hasPhotographyTag(item)
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword')
  if (!keyword) return NextResponse.json({ error: 'keyword required' }, { status: 400 })

  const apiKey = process.env.REDFOX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'REDFOX_API_KEY not configured' }, { status: 500 })

  const keywords = keyword.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 1)
  const results = await Promise.all(keywords.map((k) => searchByKeyword(k, apiKey)))

  const seen = new Set<string>()
  const merged: { photoId: string; title: string; coverUrl: string; link: string; likeCount: number; category: string }[] = []

  for (const list of results) {
    for (const item of list) {
      const id = item.workId as string
      if (!id || seen.has(id)) continue
      const coverUrl = item.coverUrl as string
      if (!coverUrl) continue
      if (!isPhotographyWork(item)) continue
      seen.add(id)
      merged.push({
        photoId: id,
        title: (item.workDesc as string)?.split('\n')[0] || '',
        coverUrl,
        link: `https://www.xiaohongshu.com/explore/${id}`,
        likeCount: (item.workLikedCount as number) ?? 0,
        category: (item.accountType as string) || '',
      })
    }
  }

  return NextResponse.json({ keyword, items: merged.slice(0, 20) })
}
