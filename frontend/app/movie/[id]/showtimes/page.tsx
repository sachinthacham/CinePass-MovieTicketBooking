'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { moviesApi } from '@/lib/api/movies'
import { showtimesApi } from '@/lib/api/showtimes'
import type { Showtime } from '@/lib/types'

function toLocalYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function ShowtimesPage() {
  const { id } = useParams<{ id: string }>()

  const [selectedDate, setSelectedDate] = React.useState<string>(
    toLocalYmd(new Date())
  )

  const { data: movieData } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesApi.getById(id),
  })

  const { data: showtimesData, isLoading } = useQuery({
    queryKey: ['showtimes', id, selectedDate],
    queryFn: () => showtimesApi.getByMovie(id, selectedDate),
  })

  const movie = movieData?.data
  const showtimes = showtimesData?.data ?? []

  // Group showtimes by theatre (name — API has no theater id on list DTO)
  const groupedByTheatre = React.useMemo(() => {
    const map = new Map<string, { name: string; showtimes: Showtime[] }>()
    showtimes.forEach((st) => {
      const key = st.theaterName ?? st.screenName ?? 'unknown'
      if (!map.has(key)) {
        map.set(key, { name: st.theaterName ?? 'Unknown Theatre', showtimes: [] })
      }
      map.get(key)!.showtimes.push(st)
    })
    return Array.from(map.values())
  }, [showtimes])

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      value: toLocalYmd(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    }
  })

  return (
    <div className="container mx-auto px-4 py-8 md:px-8 max-w-5xl min-h-[calc(100vh-14rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/movies/${id}`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-(--font-display) text-2xl font-bold">{movie?.title ?? 'Movie Showtimes'}</h1>
          <p className="text-(--muted-foreground) text-sm mt-1">Select a date and showtime</p>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
        {dates.map((date) => (
          <Button
            key={date.value}
            variant={selectedDate === date.value ? 'secondary' : 'outline'}
            className="shrink-0 flex flex-col h-auto py-3 px-4"
            onClick={() => setSelectedDate(date.value)}
          >
            <Calendar className="h-4 w-4 mb-1" />
            <span className="text-xs">{date.label}</span>
          </Button>
        ))}
      </div>

      {/* Showtimes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
        </div>
      ) : groupedByTheatre.length === 0 ? (
        <div className="text-center py-16 border border-(--border) rounded-2xl">
          <p className="text-(--muted-foreground)">
            No showtimes available for the selected date.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByTheatre.map((theatre) => (
            <div key={theatre.name} className="border border-(--border) rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">{theatre.name}</h3>
              <div className="space-y-4">
                {/* Group by format */}
                {Object.entries(
                  theatre.showtimes.reduce<Record<string, Showtime[]>>((acc, st) => {
                    const fmt = st.showFormatName ?? 'Standard'
                    if (!acc[fmt]) acc[fmt] = []
                    acc[fmt].push(st)
                    return acc
                  }, {})
                ).map(([format, fmtShowtimes]) => (
                  <div key={format}>
                    <p className="text-sm font-semibold text-(--muted-foreground) mb-2">{format}</p>
                    <div className="flex flex-wrap gap-2">
                      {fmtShowtimes.map((st) => (
                        <Link
                          key={st.id}
                          href={`/movie/${id}/seats?showtimeId=${st.id}`}
                        >
                          <Button variant="outline" className="text-sm">
                            {new Date(st.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
