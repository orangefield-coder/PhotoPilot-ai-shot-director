'use client'

import { Plan } from '@/lib/types'
import { ShotCard } from './ShotCard'
import { Progress } from '@/components/ui/progress'

interface NineGridProps {
  plan: Plan
  completedCount: number
  onShotClick: (shotId: number) => void
}

export function NineGrid({ plan, completedCount, onShotClick }: NineGridProps) {
  const total = plan.shots.length
  const pct = Math.round((completedCount / total) * 100)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-stone-800 leading-tight">{plan.plan_name}</h2>
        <div className="flex items-center gap-2">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs text-stone-400 shrink-0">{completedCount}/{total}</span>
        </div>
      </div>

      {/* 3×3 Grid */}
      <div className="grid grid-cols-3 gap-2">
        {plan.shots.map((shot, i) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            index={i}
            onClick={() => onShotClick(shot.id)}
          />
        ))}
      </div>

      {completedCount === total && (
        <div className="text-center py-4 text-stone-600 text-sm">
          🎉 全部完成！你拍出了一组完整的照片
        </div>
      )}
    </div>
  )
}
