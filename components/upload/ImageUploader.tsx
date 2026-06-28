'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

interface ImageUploaderProps {
  label: string
  sublabel: string
  value: File | null
  onChange: (file: File | null) => void
  icon?: string
}

export function ImageUploader({ label, sublabel, value, onChange, icon }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const preview = value ? URL.createObjectURL(value) : null

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) onChange(file)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      className={`relative flex flex-col items-center justify-center w-full aspect-square rounded-2xl border-2 cursor-pointer transition-all overflow-hidden
        ${dragging ? 'border-stone-400 bg-stone-100' : 'border-dashed border-stone-300 bg-stone-50'}
        ${preview ? 'border-solid border-stone-200' : ''}`}
    >
      {preview ? (
        <>
          <Image src={preview} alt={label} fill className="object-cover" />
          <button
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center leading-none hover:bg-black/70 transition-colors"
          >×</button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-12 h-12 flex items-center justify-center">
            {icon ? (
              <Image src={icon} alt="" width={48} height={48} className="object-contain" />
            ) : (
              <span className="text-2xl">📷</span>
            )}
          </div>
          <p className="text-sm font-medium text-stone-700">{label}</p>
          <p className="text-xs text-stone-400">{sublabel}</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
