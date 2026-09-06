'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  max?: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export function StarRating({
  value,
  max = 10,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  const stars = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {stars.map((star) => {
        const filled = (hovered ?? value) >= star
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            className={cn(
              'transition-transform',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            aria-label={`Rate ${star} out of ${max}`}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled ? 'text-(--primary) fill-(--primary)' : 'text-(--muted-foreground)'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
