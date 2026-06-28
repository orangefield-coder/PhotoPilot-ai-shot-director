'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

type Tool = 'pen' | 'arrow' | 'text' | 'eraser'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000']
const STROKE_WIDTH: Record<Tool, number> = { pen: 3, arrow: 2, text: 0, eraser: 16 }

interface Props {
  imageUrl: string
  onSave: (blob: Blob) => void
  onCancel: () => void
}

interface Point { x: number; y: number }

export function ImageAnnotator({ imageUrl, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#ef4444')
  const [drawing, setDrawing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<Point | null>(null)
  const startRef = useRef<Point>({ x: 0, y: 0 })
  const lastRef = useRef<Point>({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      const maxW = window.innerWidth
      const maxH = window.innerHeight * 0.72
      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const overlay = overlayRef.current!
      overlay.width = canvas.width
      overlay.height = canvas.height
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = imageUrl
    return () => {}
  }, [imageUrl])

  const getPos = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = canvasRef.current!.width / rect.width
    const scaleY = canvasRef.current!.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === 'text') {
      setTextPos(getPos(e))
      setTextInput('')
      return
    }
    setDrawing(true)
    const p = getPos(e)
    startRef.current = p
    lastRef.current = p
    if (tool === 'pen' || tool === 'eraser') {
      const ctx = canvasRef.current!.getContext('2d')!
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
    }
  }

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing) return
    const p = getPos(e)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    if (tool === 'pen') {
      ctx.strokeStyle = color
      ctx.lineWidth = STROKE_WIDTH.pen
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      lastRef.current = p
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = STROKE_WIDTH.eraser
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      lastRef.current = p
    } else if (tool === 'arrow') {
      // draw arrow preview on overlay
      const overlay = overlayRef.current!
      const oc = overlay.getContext('2d')!
      oc.clearRect(0, 0, overlay.width, overlay.height)
      drawArrow(oc, startRef.current, p, color)
      lastRef.current = p
    }
  }, [drawing, tool, color])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!drawing) return
    setDrawing(false)
    if (tool === 'arrow') {
      const p = getPos(e)
      const ctx = canvasRef.current!.getContext('2d')!
      drawArrow(ctx, startRef.current, p, color)
      const oc = overlayRef.current!.getContext('2d')!
      oc.clearRect(0, 0, overlayRef.current!.width, overlayRef.current!.height)
    }
  }, [drawing, tool, color])

  const commitText = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); return }
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.font = 'bold 20px sans-serif'
    ctx.fillStyle = color
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 3
    ctx.strokeText(textInput, textPos.x, textPos.y)
    ctx.fillText(textInput, textPos.x, textPos.y)
    setTextPos(null)
    setTextInput('')
  }

  const handleSave = () => {
    try {
      canvasRef.current!.toBlob((blob) => { if (blob) onSave(blob) }, 'image/jpeg', 0.9)
    } catch {
      alert('无法导出标注图（跨域限制），请直接关闭。')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-900 overflow-x-auto shrink-0">
        {(['pen', 'arrow', 'text', 'eraser'] as Tool[]).map((t) => (
          <button key={t} onClick={() => setTool(t)}
            className={`shrink-0 w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all
              ${tool === t ? 'bg-white text-stone-900' : 'text-stone-400 hover:text-white'}`}>
            {t === 'pen' ? '✏️' : t === 'arrow' ? '➡️' : t === 'text' ? 'T' : '⌫'}
          </button>
        ))}
        <div className="w-px h-6 bg-stone-700 mx-1 shrink-0" />
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            style={{ backgroundColor: c }}
            className={`shrink-0 w-6 h-6 rounded-full border-2 transition-all
              ${color === c ? 'border-white scale-110' : 'border-transparent'}`} />
        ))}
        <div className="flex-1" />
        <button onClick={onCancel} className="shrink-0 text-xs text-stone-400 hover:text-white px-2">取消</button>
        <button onClick={handleSave} className="shrink-0 text-xs bg-white text-stone-900 font-medium px-3 py-1.5 rounded-lg">完成</button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2">
        <div className="relative">
          <canvas ref={canvasRef} className="block max-w-full touch-none" style={{ cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} />
          <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
        </div>
      </div>

      {/* Text input popup */}
      {textPos && (
        <div className="absolute inset-x-0 bottom-0 bg-stone-900 px-4 py-3 flex gap-2 items-center">
          <input autoFocus value={textInput} onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitText()}
            placeholder="输入文字，回车确认"
            className="flex-1 h-10 px-3 rounded-lg bg-stone-800 text-white text-sm placeholder:text-stone-500 focus:outline-none" />
          <button onClick={commitText} className="text-sm bg-white text-stone-900 font-medium px-3 py-1.5 rounded-lg">放置</button>
        </div>
      )}
    </div>
  )
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string) {
  const headLen = 16
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = STROKE_WIDTH.arrow
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}
