'use client'

import { useState } from 'react'
import { Plan } from '@/lib/types'
import { ShotCard } from './ShotCard'

interface NineGridProps {
  plan: Plan
  completedCount: number
  onShotClick: (shotId: number) => void
  onRename: (name: string) => void
}

export function NineGrid({ plan, completedCount, onShotClick, onRename }: NineGridProps) {
  const total = plan.shots.length
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(plan.plan_name)

  const handleCommit = () => {
    setEditing(false)
    const name = draft.trim() || plan.plan_name
    setDraft(name)
    if (name !== plan.plan_name) onRename(name)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCommit() }}
            className="font-[family-name:var(--font-serif)] text-xl font-bold text-stone-900 tracking-wide leading-tight bg-transparent border-b border-stone-400 focus:outline-none flex-1 mr-4"
          />
        ) : (
          <h2
            className="font-[family-name:var(--font-serif)] text-xl font-bold text-stone-900 tracking-wide leading-tight cursor-pointer"
            onDoubleClick={() => { setDraft(plan.plan_name); setEditing(true) }}
          >{plan.plan_name}</h2>
        )}
        <span className="text-xs tracking-[0.2em] text-stone-400 shrink-0">{completedCount} / {total}</span>
      </div>

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
        <p className="text-center py-4 text-[10px] tracking-[0.25em] text-stone-400">— 全部完成 —</p>
      )}
    </div>
  )
}
