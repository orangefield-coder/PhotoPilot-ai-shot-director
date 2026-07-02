'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Shot, SceneProfile } from '@/lib/types'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'
import { ImageAnnotator } from './ImageAnnotator'
import { CameraCapture } from './CameraCapture'
import { loadPhotos, deletePhoto } from '@/lib/photoStore'

interface ShotDetailProps {
  shot: Shot
  planId: string
  profile?: SceneProfile
  onComplete: () => void
  onClose: () => void
  onUpdate: (shotId: number, updates: Partial<Shot>) => void
}

const FIELD_LABELS: Record<string, string> = {
  scene_prompt: '情境 SCENE',
  behavior: '动作 ACTION',
  lighting: '用光 LIGHT',
  angle: '角度 ANGLE',
  composition: '景别 LENS',
}

async function loadPoseRefs(planId: string, shotId: number): Promise<string[]> {
  if (!supabase) return []
  const prefix = `pose-refs/${planId}/${shotId}/`
  const { data } = await supabase.storage.from(STORAGE_BUCKET).list(prefix)
  if (!data?.length) return []
  return data.map((f) => {
    const { data: urlData } = supabase!.storage.from(STORAGE_BUCKET).getPublicUrl(prefix + f.name)
    return urlData.publicUrl
  })
}

async function uploadPoseRef(planId: string, shotId: number, file: File): Promise<string | null> {
  if (!supabase) return null
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `pose-refs/${planId}/${shotId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function deletePoseRef(url: string): Promise<boolean> {
  if (!supabase) return false
  const marker = `/object/public/${STORAGE_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return false
  const path = decodeURIComponent(url.slice(idx + marker.length))
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  return !error
}

type EditableFields = Pick<Shot, 'title' | 'composition' | 'scene_prompt' | 'behavior' | 'lighting' | 'angle'>

export function ShotDetail({ shot, planId, profile, onComplete, onClose, onUpdate }: ShotDetailProps) {
  const isCompleted = shot.status === 'completed'
  const fields = ['scene_prompt', 'behavior', 'lighting', 'angle', 'composition'] as const
  const [refs, setRefs] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [annotatingUrl, setAnnotatingUrl] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [draft, setDraft] = useState<EditableFields>({
    title: shot.title,
    composition: shot.composition,
    scene_prompt: shot.scene_prompt,
    behavior: shot.behavior,
    lighting: shot.lighting,
    angle: shot.angle,
  })

  useEffect(() => {
    setDraft({
      title: shot.title,
      composition: shot.composition,
      scene_prompt: shot.scene_prompt,
      behavior: shot.behavior,
      lighting: shot.lighting,
      angle: shot.angle,
    })
  }, [shot])

  useEffect(() => {
    loadPoseRefs(planId, shot.id).then((supabaseRefs) => {
      const saved = shot.savedRefs ?? []
      const merged = [...supabaseRefs, ...saved.filter((u) => !supabaseRefs.includes(u))]
      setRefs(merged)
    })
  }, [planId, shot.id, shot.savedRefs])

  // Local captured photos from IndexedDB
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  useEffect(() => {
    loadPhotos(planId, shot.id).then((urls) => {
      setCapturedPhotos(urls)
      // Restore selectedPhoto objectURL from persisted index
      if (shot.selectedPhotoIndex !== undefined && urls[shot.selectedPhotoIndex]) {
        onUpdate(shot.id, { selectedPhoto: urls[shot.selectedPhotoIndex] })
      }
    })
  }, [planId, shot.id])

  const handleNewCapture = (objectUrl: string) => {
    setCapturedPhotos((prev) => [...prev, objectUrl])
  }

  const handleSelectPhoto = (objectUrl: string, index: number) => {
    const isAlreadySelected = shot.selectedPhotoIndex === index
    onUpdate(shot.id, {
      selectedPhoto: isAlreadySelected ? undefined : objectUrl,
      selectedPhotoIndex: isAlreadySelected ? undefined : index,
    })
  }

  const handleDeleteCaptured = async (index: number) => {
    const url = capturedPhotos[index]
    await deletePhoto(planId, shot.id, index)
    URL.revokeObjectURL(url)
    const newPhotos = capturedPhotos.filter((_, i) => i !== index)
    setCapturedPhotos(newPhotos)
    if (shot.selectedPhotoIndex === index) {
      onUpdate(shot.id, { selectedPhoto: undefined, selectedPhotoIndex: undefined })
    } else if (shot.selectedPhotoIndex !== undefined && shot.selectedPhotoIndex > index) {
      // index shifted down
      onUpdate(shot.id, { selectedPhotoIndex: shot.selectedPhotoIndex - 1 })
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadPoseRef(planId, shot.id, file)
    if (url) setRefs((prev) => [...prev, url])
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (url: string) => {
    const ok = await deletePoseRef(url)
    if (ok) setRefs((prev) => prev.filter((u) => u !== url))
  }

  const handleAnnotationSave = async (blob: Blob) => {
    if (!annotatingUrl) return
    setAnnotatingUrl(null)
    setUploading(true)
    // delete old, upload annotated version
    await deletePoseRef(annotatingUrl)
    const file = new File([blob], `annotated-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const newUrl = await uploadPoseRef(planId, shot.id, file)
    if (newUrl) setRefs((prev) => prev.map((u) => u === annotatingUrl ? newUrl : u))
    setUploading(false)
  }

  const [generating, setGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showPromptEdit, setShowPromptEdit] = useState(false)

  const handleGenerate = async (customPrompt?: string) => {
    setGenerating(true)
    setShowPromptEdit(false)
    try {
      const res = await fetch('/api/generate-ref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_prompt: shot.scene_prompt,
          behavior: shot.behavior,
          lighting: shot.lighting,
          composition: shot.composition,
          angle: shot.angle,
          extra: customPrompt,
          planId,
          shotId: shot.id,
          person: profile?.person,
          scene: profile?.scene,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { imageUrl, prompt } = await res.json()
      setAiPrompt(prompt)
      if (imageUrl) {
        setRefs((prev) => [...prev, imageUrl])
        const existing = shot.savedRefs ?? []
        onUpdate(shot.id, { savedRefs: [...existing, imageUrl] })
      }
    } catch (err) {
      console.error('[generate-ref]', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    onUpdate(shot.id, draft)
    setEditing(false)
  }

  return (
    <div className="flex flex-col pb-safe">
      {/* Drag handle */}
      <div className="flex justify-center -mt-2 mb-4">
        <div className="w-9 h-1 rounded-full bg-stone-300" />
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.15em] text-stone-400 mb-1 uppercase">{editing ? draft.composition : shot.composition}</p>
          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full text-xl font-semibold tracking-[-0.022em] text-stone-900 bg-stone-100 rounded-xl px-3 py-1.5 focus:outline-none"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
            />
          ) : (
            <h3
              className="text-xl font-semibold tracking-[-0.022em] text-stone-900 cursor-pointer leading-tight"
              onDoubleClick={() => setEditing(true)}
            >{shot.title}</h3>
          )}
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`shrink-0 text-[10px] tracking-[0.15em] px-3 py-1.5 transition-all border
            ${editing ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-400 hover:border-stone-600 hover:text-stone-600'}`}
        >
          {editing ? '完成' : '编辑'}
        </button>
      </div>

      {/* Fields — borderless list with dividers */}
      <div className="flex flex-col mb-5">
        {fields.map((key, i) => (
          <div key={key} className={`flex flex-col py-3 ${i < fields.length - 1 ? 'border-b border-stone-100' : ''}`}>
            <p className="text-xs tracking-[0.15em] text-stone-400 mb-1 uppercase">{FIELD_LABELS[key]}</p>
            {editing ? (
              <textarea
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                rows={2}
                className="w-full text-sm text-stone-800 bg-transparent resize-none focus:outline-none leading-relaxed tracking-[-0.011em]"
              />
            ) : (
              <p
                className="text-sm text-stone-800 leading-relaxed tracking-[-0.011em] cursor-pointer"
                onDoubleClick={() => setEditing(true)}
              >{(shot as unknown as Record<string, string>)[key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Refs — manual upload + AI generate */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-[0.15em] text-stone-400">参考图 REF</p>
          <div className="flex items-center gap-3">
            {aiPrompt && (
              <button
                onClick={() => setShowPromptEdit((v) => !v)}
                className="text-[10px] tracking-[0.1em] text-stone-400 hover:text-stone-600"
              >
                {showPromptEdit ? '收起' : 'edit prompt'}
              </button>
            )}
            <button
              onClick={() => handleGenerate()}
              disabled={generating || uploading}
              className="text-[10px] tracking-[0.1em] text-stone-400 hover:text-stone-700 disabled:opacity-40"
            >
              {generating ? 'generating...' : '✦'}
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading || generating}
              className="text-[10px] tracking-[0.1em] text-stone-400 hover:text-stone-700 disabled:opacity-40"
            >
              {uploading ? 'uploading...' : '+ add'}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {showPromptEdit && (
          <div className="flex flex-col gap-2">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="w-full text-xs text-stone-700 bg-stone-100 px-3 py-2 resize-none focus:outline-none focus:ring focus:ring-stone-200"
            />
            <button
              onClick={() => handleGenerate(aiPrompt)}
              disabled={generating}
              className="self-end text-[10px] tracking-[0.15em] border border-stone-900 text-stone-900 px-3 py-1.5 hover:bg-stone-900 hover:text-white transition-colors disabled:opacity-40"
            >
              {generating ? '生成中...' : '— 用此 prompt 生成 —'}
            </button>
          </div>
        )}

        {generating && (
          <div className="h-24 bg-stone-100 flex items-center justify-center">
            <p className="text-xs text-stone-400 animate-pulse">AI 正在生成参考图...</p>
          </div>
        )}

        {refs.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {refs.map((url) => (
              <div key={url} className="relative shrink-0 w-24 h-24 overflow-hidden bg-stone-100 border border-stone-200">
                <Image src={url} alt="参考图" fill className="object-cover cursor-pointer"
                  onClick={() => setAnnotatingUrl(url)} />
                <button
                  onClick={() => handleDelete(url)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white text-xs flex items-center justify-center leading-none"
                >×</button>
                <div className="absolute bottom-1 left-1 bg-black/40 px-1 py-0.5 text-white text-[8px] tracking-widest leading-none pointer-events-none">
                  edit
                </div>
              </div>
            ))}
          </div>
        ) : (
          !generating && <p className="text-xs text-stone-300">添加参考图，或点击 ✦ 自动生成</p>
        )}
      </div>

      {/* Captured photos album */}
      <div className="flex flex-col gap-2 mb-5">
        <p className="text-xs tracking-[0.15em] text-stone-400">拍摄照片 PHOTOS</p>
        {capturedPhotos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {capturedPhotos.map((url, i) => {
              const isSelected = shot.selectedPhotoIndex === i
              return (
                <div key={i} className={`relative shrink-0 w-24 h-24 overflow-hidden bg-stone-100 border ${isSelected ? 'border-stone-900 border-2' : 'border-stone-200'}`}>
                  <Image src={url} alt="拍摄照片" fill className="object-cover cursor-pointer"
                    onClick={() => handleSelectPhoto(url, i)} />
                  {isSelected && (
                    <div className="absolute bottom-1 left-1 bg-stone-900 px-1 py-0.5 text-white text-[8px] tracking-widest leading-none pointer-events-none">
                      ✓
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteCaptured(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white text-xs flex items-center justify-center leading-none"
                  >×</button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-stone-300">拍摄后照片会出现在这里，点击选为封面</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setCameraOpen(true)}
          className="flex-1 h-11 rounded-xl text-sm font-medium tracking-[-0.011em] text-white bg-stone-900 transition-all active:scale-[0.98]"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          开始拍摄
        </button>
        <button
          onClick={() => { onComplete(); onClose() }}
          className={`flex-1 h-11 rounded-xl text-sm font-medium tracking-[-0.011em] transition-all active:scale-[0.98] border
            ${isCompleted ? 'border-stone-400 text-stone-500 hover:bg-stone-100' : 'border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white'}`}
        >
          {isCompleted ? '已完成' : '标记完成'}
        </button>
      </div>

      {annotatingUrl && (
        <ImageAnnotator
          imageUrl={annotatingUrl}
          onSave={handleAnnotationSave}
          onCancel={() => setAnnotatingUrl(null)}
        />
      )}

      {cameraOpen && (
        <CameraCapture
          planId={planId}
          shotId={shot.id}
          shotTitle={shot.title}
          shotComposition={shot.composition}
          shotScenePrompt={shot.scene_prompt}
          refs={refs}
          onCapture={handleNewCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  )
}

