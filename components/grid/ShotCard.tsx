'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Shot } from '@/lib/types'

interface ShotCardProps {
  shot: Shot
  index: number
  onClick: () => void
}

export function ShotCard({ shot, index, onClick }: ShotCardProps) {
  const isCompleted = shot.status === 'completed'
  const hasPhoto = !!shot.selectedPhoto
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id })

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none' as const,
  }

  return (
    <div ref={setNodeRef} style={dragStyle} className="relative w-full aspect-square">
      <div
        className="relative flex flex-col items-start justify-between w-full h-full rounded-[20px] p-2.5 cursor-grab active:cursor-grabbing active:scale-[0.96] overflow-hidden transition-all duration-500"
        style={{
          opacity: isDragging ? 0.3 : 1,
          background: isCompleted && !hasPhoto ? '#e8ddd4' : '#f5f5f4',
          border: '0.5px solid rgba(255,255,255,0.55)',
          boxShadow: isCompleted && !hasPhoto
            ? '0 2px 16px rgba(180,150,120,0.25)'
            : '0 2px 12px rgba(0,0,0,0.06)',
        }}
        {...attributes}
        {...listeners}
        onClick={onClick}
      >
        {hasPhoto && (
          <>
            <Image src={shot.selectedPhoto!} alt="" fill className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-16"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
          </>
        )}

        <p className={`relative font-[family-name:var(--font-serif)] text-xl leading-tight w-full text-center
          ${hasPhoto ? 'text-white/80' : isCompleted ? 'text-stone-500' : 'text-stone-700'}`}>
          {shot.composition}
        </p>

        <div className="relative flex items-end justify-center w-full">
          <p className={`text-[10px] leading-tight line-clamp-2 text-center
            ${hasPhoto ? 'text-white/80' : isCompleted ? 'text-stone-400' : 'text-stone-500'}`}>
            {shot.title.split('·')[0]}
          </p>
        </div>
      </div>
    </div>
  )
}

