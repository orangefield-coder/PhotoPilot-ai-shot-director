'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { Button } from '@/components/ui/button'
import { SceneProfile, Plan } from '@/lib/types'
import { getUserToken, saveLocalPlan } from '@/hooks/usePlan'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'

const SHOT_TYPES: string[] = ['日常', '写真', '街拍', '毕业照', '旅拍']
const VISUAL_STYLES: string[] = ['校园风', '新中式', '港风', '生命力感', '文艺风']

const LOADING_STEPS = ['正在分析场景', '正在规划照片', '正在生成任务']

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
  if (!supabase) throw new Error('Supabase not configured')
  const path = `${label}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'ai' | 'custom'>('ai')
  const [customName, setCustomName] = useState('')
  const [selfie, setSelfie] = useState<File | null>(null)
  const [scene, setScene] = useState<File | null>(null)
  const [shotType, setShotType] = useState<string>('日常')
  const [visualStyle, setVisualStyle] = useState<string>('')
  const [emotion, setEmotion] = useState<string>('')
  const [personNotes, setPersonNotes] = useState<string>('')
  const [sceneNotes, setSceneNotes] = useState<string>('')
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

      // Merge user-supplied keywords into the AI profile
      if (personNotes.trim()) {
        profile.person.style = [profile.person.style, personNotes.trim()].filter(Boolean).join('，')
      }
      if (sceneNotes.trim()) {
        profile.scene.elements = [...profile.scene.elements, sceneNotes.trim()]
      }
      setLoadingStep(2)

      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, shotType, visualStyle, emotion }),
      })
      if (!generateRes.ok) throw new Error('方案生成失败，请重试')
      const plan: Plan = { ...(await generateRes.json()), profile }

      const userToken = getUserToken()
      const saveRes = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken, selfieUrl, sceneUrl, shotType, visualStyle, emotion, plan }),
      })
      if (!saveRes.ok) throw new Error('保存失败')
      const saved = await saveRes.json()

      saveLocalPlan(saved.id, plan, { shot_type: shotType, selfie_url: selfieUrl, scene_url: sceneUrl, plan_name: plan.plan_name, visual_style: visualStyle, emotion })
      router.push(`/plan/${saved.id}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      setLoading(false)
    }
  }

  const handleCustomCreate = () => {
    const emptyPlan: Plan = {
      plan_name: customName.trim() || '我的拍摄方案',
      shots: Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        title: `镜头 ${i + 1}`,
        composition: '',
        scene_prompt: '',
        behavior: '',
        lighting: '',
        angle: '',
        status: 'pending' as const,
      })),
    }
    const id = `local-${crypto.randomUUID()}`
    saveLocalPlan(id, emptyPlan, { shot_type: '自定义', selfie_url: '', scene_url: '' })
    router.push(`/plan/${id}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 gap-6">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border border-stone-900 flex items-center justify-center text-stone-900 text-xs tracking-widest animate-pulse">
            REC
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
    <main className="relative min-h-screen bg-stone-50 flex flex-col max-w-md mx-auto overflow-hidden">
      <div className="relative z-10 px-6 pt-14 pb-6">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-[-0.022em] leading-tight text-stone-900">PhotoPilot | 拍档</h1>
        <p className="text-[10px] tracking-[0.2em] mt-2 text-stone-400">让每一次快门，都有导演。</p>
      </div>

      <div className="relative z-10 px-6 pb-6">
        <div className="flex gap-6 border-b border-stone-200">
          <button
            onClick={() => setMode('ai')}
            className={`pb-2 text-xs tracking-[0.15em] transition-all
              ${mode === 'ai'
                ? 'border-b-2 -mb-px border-stone-900 text-stone-900'
                : 'text-stone-400 hover:text-stone-600'}`}
          >智能导演</button>
          <button
            onClick={() => setMode('custom')}
            className={`pb-2 text-xs tracking-[0.15em] transition-all
              ${mode === 'custom'
                ? 'border-b-2 -mb-px border-stone-900 text-stone-900'
                : 'text-stone-400 hover:text-stone-600'}`}
          >自己来</button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-6 px-6 pb-8 flex-1">
        <p className="text-xs text-stone-400 -mt-2">
          {mode === 'ai' ? '上传两张照片，剩下的交给摄影导演。' : '你的创意，由你亲自导演。'}
        </p>
        {mode === 'ai' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">人物</p>
                <ImageUploader label="上传自拍" sublabel="展示穿搭效果" value={selfie} onChange={setSelfie} icon="/icon-portraits.png" />
                <input
                  type="text"
                  value={personNotes}
                  onChange={(e) => setPersonNotes(e.target.value)}
                  placeholder="妆容、发型、配饰等"
                  className="w-full h-9 px-3 border text-xs focus:outline-none placeholder:text-stone-400 rounded-xl bg-white border-stone-200 text-stone-900 focus:ring-2 focus:ring-stone-300"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">拍摄场景</p>
                <ImageUploader label="上传场景" sublabel="你要拍摄的地方" value={scene} onChange={setScene} icon="/icon-photo.png" />
                <input
                  type="text"
                  value={sceneNotes}
                  onChange={(e) => setSceneNotes(e.target.value)}
                  placeholder="特色元素、光线等"
                  className="w-full h-9 px-3 border text-xs focus:outline-none placeholder:text-stone-400 rounded-xl bg-white border-stone-200 text-stone-900 focus:ring-2 focus:ring-stone-300"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">拍摄类型</p>
              <input
                type="text"
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                placeholder="输入任意类型，如「《情书》电影感」"
                className="w-full h-9 px-3 border text-xs focus:outline-none placeholder:text-stone-400 rounded-xl bg-white border-stone-200 text-stone-900 focus:ring-2 focus:ring-stone-300"
              />
              <div className="flex flex-wrap gap-2">
                {SHOT_TYPES.map((type) => (
                  <button key={type} onClick={() => setShotType(type)}
                    className={`px-3 py-1 text-xs transition-all border
                      ${shotType === type
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-300 text-stone-500 hover:border-stone-500'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">拍摄风格（可选）</p>
              <input
                type="text"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                placeholder="或自定义输入，如：复古胶片"
                className="w-full h-9 px-3 border text-xs focus:outline-none placeholder:text-stone-400 rounded-xl bg-white border-stone-200 text-stone-900 focus:ring-2 focus:ring-stone-300"
              />
              <div className="flex flex-wrap gap-2">
                {VISUAL_STYLES.map((style) => (
                  <button key={style} onClick={() => setVisualStyle(visualStyle === style ? '' : style)}
                    className={`px-3 py-1 text-xs transition-all border
                      ${visualStyle === style
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-300 text-stone-500 hover:border-stone-500'}`}>
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">情绪基调（可选）</p>
              <input
                type="text"
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                placeholder="如：慵懒、雀跃、怀念、平静"
                className="w-full h-11 px-4 border text-sm focus:outline-none placeholder:text-stone-400 rounded-xl bg-white border-stone-200 text-stone-900 focus:ring-2 focus:ring-stone-300"
              />
            </div>

            {error && (
              <div className="bg-red-950/60 border border-red-400/30 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex-1 min-h-0 max-h-4" />

            <Button onClick={handleGenerate} disabled={!canGenerate}
              className="w-full h-11 rounded-xl text-sm font-semibold tracking-[-0.011em] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] bg-stone-900 text-white hover:bg-stone-700 border-0"
              style={{ border: 'none' }}>
              开始导演拍摄
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-500">方案名称</p>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="如：毕业季拍摄方案"
                className="w-full h-11 px-4 border text-sm focus:outline-none placeholder:text-stone-400 rounded-xl bg-white border-stone-200 text-stone-900 focus:ring-2 focus:ring-stone-300"
              />
            </div>

            <p className="text-sm text-stone-400">创建一个空白的九宫格方案，所有字段都可以手动编辑。</p>

            {error && (
              <div className="bg-red-950/60 border border-red-400/30 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex-1" />

            <Button onClick={handleCustomCreate}
              className="w-full h-11 rounded-xl text-sm font-semibold tracking-[-0.011em] transition-all duration-300 shadow-sm active:scale-[0.98] bg-stone-900 text-white hover:bg-stone-700 border-0"
              style={{ border: 'none' }}>
              开始创建
            </Button>
          </>
        )}

        <button onClick={() => router.push('/history')} className="text-center text-sm text-stone-400 hover:text-stone-600">
          查看历史方案
        </button>
      </div>
    </main>
  )
}
