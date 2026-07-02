'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { Plan, Shot, XhsRefItem } from '@/lib/types'
import { NineGrid } from '@/components/grid/NineGrid'
import { ShotDetail } from '@/components/detail/ShotDetail'
import { XhsRefPanel } from '@/components/grid/XhsRefPanel'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePlan, getLocalPlans, getUserToken } from '@/hooks/usePlan'

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

  // Rating + feedback state
  const [rating, setRating] = useState<1 | -1 | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  const handleRate = async (value: 1 | -1) => {
    const next = rating === value ? null : value
    setRating(next)
    if (!id.startsWith('local-') && next !== null) {
      await fetch(`/api/plans/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: next }),
      })
    }
  }

  const handleFeedback = async () => {
    if (!feedbackText.trim()) return
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken: getUserToken(), planId: id, content: feedbackText }),
    })
    setFeedbackSent(true)
    setFeedbackText('')
    setTimeout(() => { setFeedbackOpen(false); setFeedbackSent(false) }, 1500)
  }

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
    const newStatus = selectedShot.status === 'completed' ? 'pending' : 'completed'
    setSelectedShot((prev) => prev ? { ...prev, status: newStatus as 'pending' | 'completed' } : null)
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
    <main className="min-h-screen bg-stone-50 max-w-md mx-auto w-full overflow-x-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 pt-10 pb-4">
        <button onClick={() => router.push('/')} className="text-stone-400 text-sm hover:text-stone-600">← 返回</button>
        <button onClick={() => router.push('/history')} className="text-stone-400 text-sm hover:text-stone-600">历史</button>
      </div>

      <div className="px-4 pb-10">
        <NineGrid plan={plan} completedCount={completedCount} onShotClick={handleShotClick} onRename={handleRename} />
        {(xhsLoading || xhsItems.length > 0) && (
          <div className="overflow-hidden">
            <XhsRefPanel
              keyword={xhsKeyword}
              items={xhsItems}
              loading={xhsLoading}
              onAddToShot={handleAddRefToShot}
              shotTitles={plan.shots.map((s) => ({ id: s.id, title: s.title }))}
            />
          </div>
        )}

        {/* Rating + feedback */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-[10px] tracking-[0.15em] text-stone-400">这份方案怎么样？</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleRate(1)}
              className={`w-12 h-12 rounded-full border transition-all flex items-center justify-center
                ${rating === 1 ? 'border-stone-700 bg-stone-700' : 'border-stone-300 hover:border-stone-500'}`}
            >
              <svg viewBox="0 0 24 24" className={`w-5 h-5 ${rating === 1 ? 'fill-white' : 'fill-stone-400'}`}>
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3v11z"/>
              </svg>
            </button>
            <button
              onClick={() => handleRate(-1)}
              className={`w-12 h-12 rounded-full border transition-all flex items-center justify-center
                ${rating === -1 ? 'border-stone-700 bg-stone-700' : 'border-stone-300 hover:border-stone-500'}`}
            >
              <svg viewBox="0 0 24 24" className={`w-5 h-5 ${rating === -1 ? 'fill-white' : 'fill-stone-400'}`}>
                <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17V2z"/>
              </svg>
            </button>
          </div>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600"
          >留下反馈</button>
        </div>

        {/* Feedback sheet */}
        {feedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setFeedbackOpen(false)}>
            <div className="w-full max-w-md bg-white rounded-t-2xl px-6 pt-6 pb-10"
              onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-medium text-stone-800 mb-3">您的反馈</p>
              {feedbackSent ? (
                <p className="text-sm text-stone-500 text-center py-4">感谢反馈 ✓</p>
              ) : (
                <>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="告诉我们哪里可以改进..."
                    rows={4}
                    className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
                  />
                  <button
                    onClick={handleFeedback}
                    disabled={!feedbackText.trim()}
                    className="mt-3 w-full h-11 rounded-xl bg-stone-900 text-white text-sm font-medium disabled:opacity-30"
                  >提交</button>
                </>
              )}
            </div>
          </div>
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
