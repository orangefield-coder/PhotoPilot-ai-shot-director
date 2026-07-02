'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plan, Shot } from '@/lib/types'

function getUserToken(): string {
  if (typeof window === 'undefined') return ''
  let token = localStorage.getItem('shot-planner-token')
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem('shot-planner-token', token)
  }
  return token
}

function getLocalPlans(): Record<string, { plan: Plan; meta: { id: string; created_at: string; shot_type: string; selfie_url: string; scene_url: string; plan_name?: string; visual_style?: string; emotion?: string } }> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('shot-planner-plans') || '{}')
  } catch {
    return {}
  }
}

function saveLocalPlan(id: string, plan: Plan, meta: { shot_type: string; selfie_url: string; scene_url: string; plan_name?: string; visual_style?: string; emotion?: string }) {
  const plans = getLocalPlans()
  plans[id] = { plan, meta: { id, created_at: new Date().toISOString(), ...meta } }
  localStorage.setItem('shot-planner-plans', JSON.stringify(plans))
}

export function usePlan(initialPlan?: Plan, planId?: string) {
  const [plan, setPlan] = useState<Plan | null>(initialPlan || null)

  useEffect(() => {
    if (initialPlan) setPlan(initialPlan)
  }, [initialPlan])
  const [saving, setSaving] = useState(false)

  const markComplete = useCallback(async (shotId: number) => {
    if (!plan || !planId) return

    const current = plan.shots.find((s) => s.id === shotId)
    const newStatus = current?.status === 'completed' ? 'pending' : 'completed'

    const updated: Plan = {
      ...plan,
      shots: plan.shots.map((s) =>
        s.id === shotId ? { ...s, status: newStatus as 'pending' | 'completed' } : s
      ),
    }
    setPlan(updated) // optimistic

    // persist
    setSaving(true)
    try {
      if (planId.startsWith('local-')) {
        const all = getLocalPlans()
        if (all[planId]) {
          all[planId].plan = updated
          localStorage.setItem('shot-planner-plans', JSON.stringify(all))
        }
      } else {
        await fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: updated }),
        })
        // 埋点：镜头标记完成（仅在变为 completed 时）
        if (newStatus === 'completed') {
          const userToken = getUserToken()
          fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userToken,
              eventName: 'shot_completed',
              planId,
              shotId,
            }),
          }).catch(() => {})
        }
      }
    } finally {
      setSaving(false)
    }
  }, [plan, planId])

  const updateShot = useCallback(async (shotId: number, updates: Partial<Shot>) => {
    if (!plan || !planId) return
    const updated: Plan = {
      ...plan,
      shots: plan.shots.map((s) => s.id === shotId ? { ...s, ...updates } : s),
    }
    setPlan(updated)
    setSaving(true)
    try {
      if (planId.startsWith('local-')) {
        const all = getLocalPlans()
        if (all[planId]) {
          all[planId].plan = updated
          localStorage.setItem('shot-planner-plans', JSON.stringify(all))
        }
      } else {
        await fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: updated }),
        })
      }
    } finally {
      setSaving(false)
    }
  }, [plan, planId])

  const reorderShots = useCallback(async (newShots: Shot[]) => {
    if (!plan || !planId) return
    const updated: Plan = { ...plan, shots: newShots }
    setPlan(updated)
    setSaving(true)
    try {
      if (planId.startsWith('local-')) {
        const all = getLocalPlans()
        if (all[planId]) {
          all[planId].plan = updated
          localStorage.setItem('shot-planner-plans', JSON.stringify(all))
        }
      } else {
        await fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: updated }),
        })
      }
    } finally {
      setSaving(false)
    }
  }, [plan, planId])

  const completedCount = plan?.shots.filter((s) => s.status === 'completed').length ?? 0

  return { plan, setPlan, markComplete, updateShot, reorderShots, completedCount, saving }
}

export { getUserToken, getLocalPlans, saveLocalPlan }
