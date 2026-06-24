'use client'

import { Shot } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface ShotCardProps {
  shot: Shot
  index: number
  onClick: () => void
}

const SHOT_ICONS = ['🌅', '🧍', '🤝', '👤', '🔍', '💃', '🚶', '✨', '🎨']

export function ShotCard({ shot, index, onClick }: ShotCardProps) {
  const isCompleted = shot.status === 'completed'

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start justify-end w-full aspect-square rounded-xl p-2 transition-all active:scale-95
        ${isCompleted
          ? 'bg-stone-800 ring-2 ring-stone-600'
          : 'bg-stone-100 ring-1 ring-stone-200 hover:bg-stone-200'}`}
    >
      {/* Icon */}
      <span className="absolute top-2 left-2 text-xl">{SHOT_ICONS[index] || '📸'}</span>

      {/* Completion checkmark */}
      {isCompleted && (
        <span className="absolute top-2 right-2 text-base">✓</span>
      )}

      {/* Title */}
      <p className={`text-xs font-medium leading-tight line-clamp-2 text-left
        ${isCompleted ? 'text-stone-300' : 'text-stone-700'}`}>
        {shot.title.split('·')[0]}
      </p>

      {/* Composition badge */}
      <Badge
        variant="secondary"
        className={`mt-1 text-[10px] px-1.5 py-0 h-4
          ${isCompleted ? 'bg-stone-700 text-stone-400' : 'bg-stone-200 text-stone-500'}`}
      >
        {shot.composition}
      </Badge>
    </button>
  )
}
