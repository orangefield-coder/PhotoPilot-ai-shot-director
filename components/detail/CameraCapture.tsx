'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { savePhoto } from '@/lib/photoStore'

interface Props {
  planId: string
  shotId: number
  shotTitle: string
  shotComposition: string
  shotScenePrompt: string
  refs: string[]
  onCapture: (objectUrl: string) => void
  onClose: () => void
}

export function CameraCapture({
  planId, shotId, shotTitle, shotComposition, shotScenePrompt,
  refs, onCapture, onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [capturing, setCapturing] = useState(false)
  const [showRefs, setShowRefs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentCaptures, setRecentCaptures] = useState<string[]>([])

  const startStream = useCallback(async (facing: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Permission') || msg.includes('denied')) {
        setError('请在浏览器设置中允许访问摄像头')
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setError('未检测到摄像头设备')
      } else {
        setError('无法打开摄像头：' + msg)
      }
    }
  }, [])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前环境不支持摄像头（需要 HTTPS 或 localhost）')
      return
    }
    startStream(facingMode)
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const switchCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await startStream(next)
  }

  const handleShutter = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || capturing) return
    setCapturing(true)
    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas empty')), 'image/jpeg', 0.92)
      )
      await savePhoto(planId, shotId, blob)
      const objectUrl = URL.createObjectURL(blob)
      setRecentCaptures((prev) => [...prev, objectUrl])
      onCapture(objectUrl)
    } finally {
      setCapturing(false)
    }
  }

  const allRefs = [...refs, ...recentCaptures.filter((u) => !refs.includes(u))]

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 flex items-start justify-between px-4 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent absolute top-0 inset-x-0 z-10">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-white/60 text-xs">{shotComposition}</p>
          <p className="text-white text-sm font-medium truncate">{shotTitle}</p>
          <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{shotScenePrompt}</p>
        </div>
        <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-lg">×</button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
            <p className="text-white/60 text-sm text-center">{error}</p>
            <button onClick={() => startStream(facingMode)}
              className="text-xs text-white bg-white/20 px-4 py-2 rounded-full">重试</button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-8 px-8">
        <div className="flex items-center justify-between">
          {/* Recent captures thumbnail */}
          <div className="w-14 h-14">
            {recentCaptures.length > 0 && (
              <button onClick={() => setShowRefs(true)}
                className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/40 relative">
                <Image src={recentCaptures[recentCaptures.length - 1]} alt="" fill className="object-cover" />
                {recentCaptures.length > 1 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+{recentCaptures.length}</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Shutter button */}
          <button onClick={handleShutter} disabled={!!error || capturing}
            className={`rounded-full border-4 border-white flex items-center justify-center transition-all
              ${capturing ? 'opacity-60' : 'active:scale-95'}`}
            style={{ width: 72, height: 72 }}>
            <div className={`rounded-full bg-white transition-all ${capturing ? 'w-10 h-10' : 'w-14 h-14'}`} />
          </button>

          {/* Switch camera */}
          <button onClick={switchCamera} disabled={!!error}
            className="w-14 h-14 rounded-full bg-white/20 text-white text-xl flex items-center justify-center disabled:opacity-30">
            🔄
          </button>
        </div>
      </div>

      {/* Captured photos drawer */}
      {showRefs && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-white text-sm font-medium">本次拍摄（{allRefs.length} 张）</p>
            <button onClick={() => setShowRefs(false)} className="text-white/60 text-sm">关闭</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2 content-start">
            {allRefs.map((url) => (
              <div key={url} className="aspect-square rounded-lg overflow-hidden relative bg-white/10">
                <Image src={url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}