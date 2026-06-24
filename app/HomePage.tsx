'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { Button } from '@/components/ui/button'
import { ShotType, SceneProfile, Plan } from '@/lib/types'
import { getUserToken, saveLocalPlan } from '@/hooks/usePlan'

const SHOT_TYPES: ShotType[] = ['旅行', '毕业照', '旗袍', '情侣', '街拍']

const LOADING_STEPS = ['AI 正在分析场景...', 'AI 正在规划照片...', 'AI 正在生成任务...']

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/i, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

async function uploadImage(file: File, label: string): Promise<string> {
  const compressed = await compressImage(file)
  const fd = new FormData()
  fd.append('file', compressed)
  fd.append('label', label)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  const { url } = await res.json()
  return url
}

export default function HomePage() {
  const router = useRouter()
  const [selfie, setSelfie] = useState<File | null>(null)
  const [scene, setScene] = useState<File | null>(null)
  const [shotType, setShotType] = useState<string>('旅行')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const canGenerate = selfie && scene && !loading

  const handleGenerate = async () => {
    if (!selfie || !scene) return
    setLoading(true)
    setError(null)
    setLoadingStep(0)

    try {
      const [selfieUrl, sceneUrl] = await Promise.all([
        uploadImage(selfie, 'selfie'),
        uploadImage(scene, 'scene'),
      ])
      setLoadingStep(1)

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfieUrl, sceneUrl }),
      })
      if (!analyzeRes.ok) throw new Error('场景分析失败，请重试')
      const profile: SceneProfile = await analyzeRes.json()
      setLoadingStep(2)

      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, shotType }),
      })
      if (!generateRes.ok) throw new Error('方案生成失败，请重试')
      const plan: Plan = await generateRes.json()

      const userToken = getUserToken()
      const saveRes = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken, selfieUrl, sceneUrl, shotType, plan }),
      })
      if (!saveRes.ok) throw new Error('保存失败')
      const saved = await saveRes.json()

      saveLocalPlan(saved.id, plan, { shot_type: shotType, selfie_url: selfieUrl, scene_url: sceneUrl })
      router.push(`/plan/${saved.id}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 gap-6">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center text-3xl animate-pulse">
            📷
          </div>
          <div className="flex flex-col items-center gap-2">
            {LOADING_STEPS.map((step, i) => (
              <p key={step} className={`text-sm transition-all duration-500
                ${i === loadingStep ? 'text-stone-900 font-medium' : i < loadingStep ? 'text-stone-400 line-through' : 'text-stone-300'}`}>
                {step}
              </p>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col max-w-md mx-auto">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-stone-900">拍摄规划</h1>
        <p className="text-sm text-stone-400 mt-1">上传照片，生成你的专属九宫格方案</p>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-stone-600">自拍 / 穿搭</p>
            <ImageUploader label="上传自拍" sublabel="展示穿搭效果" value={selfie} onChange={setSelfie} />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-stone-600">拍摄场景</p>
            <ImageUploader label="上传场景" sublabel="你要拍摄的地方" value={scene} onChange={setScene} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-stone-600">拍摄风格</p>
          <input
            type="text"
            value={shotType}
            onChange={(e) => setShotType(e.target.value)}
            placeholder="输入任意风格，如「《情书》电影感」"
            className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
          <div className="flex flex-wrap gap-2">
            {SHOT_TYPES.map((type) => (
              <button key={type} onClick={() => setShotType(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${shotType === type ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex-1" />

        <Button onClick={handleGenerate} disabled={!canGenerate}
          className="w-full h-14 rounded-2xl text-base font-semibold bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-40">
          生成拍摄方案
        </Button>

        <button onClick={() => router.push('/history')} className="text-center text-sm text-stone-400 hover:text-stone-600">
          查看历史方案
        </button>
      </div>
    </main>
  )
}
