'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserToken, getLocalPlans } from '@/hooks/usePlan'

interface PlanMeta {
  id: string
  created_at: string
  shot_type: string
  selfie_url?: string
  scene_url?: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const localPlans = getLocalPlans()
    const localMetas: PlanMeta[] = Object.values(localPlans).map((p) => p.meta)

    const userToken = getUserToken()
    fetch(`/api/plans?userToken=${userToken}`)
      .then((r) => r.json())
      .then((remote: PlanMeta[]) => {
        const remoteIds = new Set(remote.map((p) => p.id))
        const combined = [...remote, ...localMetas.filter((p) => !remoteIds.has(p.id))]
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setPlans(combined)
      })
      .catch(() => {
        const sorted = localMetas.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setPlans(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    const locals = getLocalPlans()
    if (locals[id]) {
      delete locals[id]
      localStorage.setItem('shot-planner-plans', JSON.stringify(locals))
    }
    await fetch(`/api/plans/${id}`, { method: 'DELETE' }).catch(() => {})
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <main className="min-h-screen bg-stone-50 max-w-md mx-auto">
      <div className="flex items-center gap-3 px-6 pt-10 pb-6">
        <button onClick={() => router.push('/')} className="text-stone-400 text-sm hover:text-stone-600">←</button>
        <h1 className="text-xl font-bold text-stone-900">历史方案</h1>
      </div>

      <div className="px-6 pb-10 flex flex-col gap-3">
        {loading && <p className="text-stone-400 text-sm text-center py-8">加载中...</p>}

        {!loading && plans.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">📷</span>
            <p className="text-stone-400 text-sm">还没有拍摄方案</p>
            <button onClick={() => router.push('/')}
              className="text-sm text-stone-600 underline underline-offset-2">
              去创建第一个方案
            </button>
          </div>
        )}

        {plans.map((plan) => (
          <div key={plan.id}
            className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-stone-100">
            <button onClick={() => router.push(`/plan/${plan.id}`)} className="flex-1 flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-xl shrink-0">📷</div>
              <div>
                <p className="text-sm font-medium text-stone-800">{plan.shot_type || '拍摄方案'}</p>
                <p className="text-xs text-stone-400">{formatDate(plan.created_at)}</p>
              </div>
            </button>
            <button onClick={() => handleDelete(plan.id)}
              className="text-stone-300 hover:text-red-400 text-lg px-1 transition-colors"
              aria-label="删除">
              ×
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
