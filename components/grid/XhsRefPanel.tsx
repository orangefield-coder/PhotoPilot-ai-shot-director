'use client'

import { useState } from 'react'
import Image from 'next/image'
import { XhsRefItem } from '@/lib/types'

interface XhsRefPanelProps {
  keyword: string
  items: XhsRefItem[]
  loading: boolean
  onAddToShot: (url: string, shotId: number) => void
  shotTitles: { id: number; title: string }[]
}

export function XhsRefPanel({ keyword, items, loading, onAddToShot, shotTitles }: XhsRefPanelProps) {
  const [addingUrl, setAddingUrl] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-[9px] tracking-[0.2em] text-stone-400">作品参考</p>
        <p className="text-xs text-stone-300 animate-pulse">正在搜索小红书参考...</p>
      </div>
    )
  }

  if (!items.length) return null

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] tracking-[0.2em] text-stone-400">作品参考</p>
        <p className="text-[9px] text-stone-300">来自小红书 · 搜索词：{keyword}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {items.map((item) => {
          const proxiedUrl = `/api/img-proxy?url=${encodeURIComponent(item.coverUrl)}`
          return (
            <div key={item.photoId} className="relative shrink-0 flex flex-col" style={{ width: 96 }}>
              <div className="relative w-24 rounded-xl overflow-hidden bg-stone-100" style={{ aspectRatio: '3/4' }}>
                <Image
                  src={proxiedUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={() => setAddingUrl(item.coverUrl)}
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 transition-colors"
                  title="加入镜头REF"
                >+</button>
              </div>
              <p className="text-[9px] text-stone-500 mt-1 line-clamp-1 leading-tight">
                {item.title || '无标题'}
              </p>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-stone-400 underline leading-tight"
              >
                查看原帖
              </a>
            </div>
          )
        })}
      </div>

      {addingUrl && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setAddingUrl(null)}>
          <div
            className="w-full max-w-md bg-white rounded-t-2xl px-6 pt-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-stone-800 mb-4">加入哪个镜头的 REF？</p>
            <div className="flex flex-col gap-1">
              {shotTitles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onAddToShot(addingUrl, s.id); setAddingUrl(null) }}
                  className="text-left px-3 py-2.5 rounded-xl text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  {s.id}. {s.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAddingUrl(null)}
              className="mt-4 w-full py-2.5 text-sm text-stone-400 hover:text-stone-600"
            >取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
