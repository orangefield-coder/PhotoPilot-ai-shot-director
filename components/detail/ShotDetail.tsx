'use client'

import { Shot } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface ShotDetailProps {
  shot: Shot
  onComplete: () => void
  onClose: () => void
}

const FIELD_ICONS: Record<string, string> = {
  goal: '🎯',
  environment: '🏛️',
  pose: '🧍',
  composition: '📐',
  focal_length: '🔭',
  reason: '💡',
}

const FIELD_LABELS: Record<string, string> = {
  goal: '拍摄目标',
  environment: '场景用法',
  pose: '姿势建议',
  composition: '景别',
  focal_length: '焦段建议',
  reason: '为什么拍',
}

export function ShotDetail({ shot, onComplete, onClose }: ShotDetailProps) {
  const isCompleted = shot.status === 'completed'
  const fields = ['goal', 'environment', 'pose', 'composition', 'focal_length', 'reason'] as const

  return (
    <div className="flex flex-col gap-5 pb-safe">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-stone-400 mb-0.5">{shot.composition}</p>
          <h3 className="text-xl font-semibold text-stone-900">{shot.title}</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 text-2xl leading-none mt-0.5">×</button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3">
        {fields.map((key) => (
          <div key={key} className="flex gap-3">
            <span className="text-lg mt-0.5 shrink-0">{FIELD_ICONS[key]}</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-xs text-stone-400 font-medium">{FIELD_LABELS[key]}</p>
              <p className="text-sm text-stone-800 leading-relaxed">{(shot as Record<string, string>)[key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action button */}
      <Button
        onClick={() => { onComplete(); onClose() }}
        disabled={isCompleted}
        className={`w-full h-12 rounded-xl text-base font-medium
          ${isCompleted
            ? 'bg-stone-200 text-stone-400 cursor-default'
            : 'bg-stone-900 text-white hover:bg-stone-700'}`}
      >
        {isCompleted ? '✓ 已完成' : '标记完成'}
      </Button>
    </div>
  )
}
