'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { Plan, Shot } from '@/lib/types'
import { NineGrid } from '@/components/grid/NineGrid'
import { ShotDetail } from '@/components/detail/ShotDetail'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePlan, getLocalPlans } from '@/hooks/usePlan'

interface PlanPageProps {
  params: Promise<{ id: string }>
}

export default function PlanPage({ params }: PlanPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initPlan, setInitPlan] = useState<Plan | null>(null)

  useEffect(() => {
    // Try local first
    const locals = getLocalPlans()
    if (locals[id]) {
      setInitPlan(locals[id].plan)
      setLoading(false)
      return
    }
    // Then Supabase
    fetch(`/api/plans?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.plan_json) setInitPlan(data.plan_json)
      })
      .finally(() => setLoading(false))
  }, [id])

  const { plan, markComplete, completedCount } = usePlan(initPlan ?? undefined, id)

  const handleShotClick = (shotId: number) => {
    const shot = plan?.shots.find((s) => s.id === shotId)
    if (shot) { setSelectedShot(shot); setSheetOpen(true) }
  }

  const handleComplete = async () => {
    if (!selectedShot) return
    await markComplete(selectedShot.id)
    // update selected shot state
    setSelectedShot((prev) => prev ? { ...prev, status: 'completed' } : null)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-400 text-sm">加载中...</p>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-4 px-6">
        <p className="text-stone-500 text-center">找不到这个方案</p>
        <button onClick={() => router.push('/')} className="text-sm text-stone-400 underline">返回首页</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 max-w-md mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 pt-10 pb-4">
        <button onClick={() => router.push('/')} className="text-stone-400 text-sm hover:text-stone-600">← 返回</button>
        <button onClick={() => router.push('/history')} className="text-stone-400 text-sm hover:text-stone-600">历史</button>
      </div>

      <div className="px-4 pb-10">
        <NineGrid plan={plan} completedCount={completedCount} onShotClick={handleShotClick} />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pt-6 pb-10 max-h-[85vh] overflow-y-auto">
          {selectedShot && (
            <ShotDetail
              shot={selectedShot}
              onComplete={handleComplete}
              onClose={() => setSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </main>
  )
}
