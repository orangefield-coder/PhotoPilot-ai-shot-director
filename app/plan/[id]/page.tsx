'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { Plan, Shot, XhsRefItem } from '@/lib/types'
import { NineGrid } from '@/components/grid/NineGrid'
import { ShotDetail } from '@/components/detail/ShotDetail'
import { XhsRefPanel } from '@/components/grid/XhsRefPanel'
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

  const { plan, setPlan, markComplete, updateShot, reorderShots, completedCount } = usePlan(initPlan ?? undefined, id)

  // XHS ref images — fetch once when keyword is first available
  const [xhsItems, setXhsItems] = useState<XhsRefItem[]>([])
  const [xhsLoading, setXhsLoading] = useState(false)
  const [xhsKeyword, setXhsKeyword] = useState('')
  const xhsFetched = useRef(false)

  useEffect(() => {
    if (xhsFetched.current) return
    const keyword = plan?.xhsKeyword
    if (!keyword) return
    xhsFetched.current = true
    setXhsKeyword(keyword)
    setXhsLoading(true)
    fetch(`/api/xhs-ref?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((d) => { if (d.items) setXhsItems(d.items) })
      .finally(() => setXhsLoading(false))
  }, [plan?.xhsKeyword])

  // Keep selectedShot in sync with plan state after edits
  useEffect(() => {
    if (selectedShot && plan) {
      const updated = plan.shots.find((s) => s.id === selectedShot.id)
      if (updated) setSelectedShot(updated)
    }
  }, [plan])

  const handleShotClick = (shotId: number) => {
    const shot = plan?.shots.find((s) => s.id === shotId)
    if (shot) { setSelectedShot(shot); setSheetOpen(true) }
  }

  const handleComplete = async () => {
    if (!selectedShot) return
    await markComplete(selectedShot.id)
    setSelectedShot((prev) => prev ? { ...prev, status: 'completed' } : null)
  }

  const handleRename = (name: string) => {
    if (!plan) return
    const updated = { ...plan, plan_name: name }
    setPlan(updated)
    if (id.startsWith('local-')) {
      const locals = JSON.parse(localStorage.getItem('localPlans') || '{}')
      if (locals[id]) { locals[id].plan = updated; localStorage.setItem('localPlans', JSON.stringify(locals)) }
    } else {
      fetch(`/api/plans/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: updated }) })
    }
  }

  const handleAddRefToShot = (url: string, shotId: number) => {
    const shot = plan?.shots.find((s) => s.id === shotId)
    if (!shot) return
    const existing = shot.savedRefs ?? []
    if (existing.includes(url)) return
    updateShot(shotId, { savedRefs: [...existing, url] })
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
        <NineGrid plan={plan} completedCount={completedCount} onShotClick={handleShotClick} onReorder={reorderShots} onRename={handleRename} />
        {(xhsLoading || xhsItems.length > 0) && (
          <XhsRefPanel
            keyword={xhsKeyword}
            items={xhsItems}
            loading={xhsLoading}
            onAddToShot={handleAddRefToShot}
            shotTitles={plan.shots.map((s) => ({ id: s.id, title: s.title }))}
          />
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pt-6 pb-10 max-h-[85vh] overflow-y-auto">
          {selectedShot && (
            <ShotDetail
              shot={selectedShot}
              planId={id}
              profile={plan.profile}
              onComplete={handleComplete}
              onClose={() => setSheetOpen(false)}
              onUpdate={updateShot}
            />
          )}
        </SheetContent>
      </Sheet>
    </main>
  )
}
