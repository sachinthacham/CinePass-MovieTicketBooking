'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { theatersApi } from '@/lib/api/theaters'
import { showtimesApi } from '@/lib/api/showtimes'
import type { Showtime } from '@/lib/types'

export default function TheatreShowtimesPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().split('T')[0])

  const { data: theaterData, isLoading: loadingTheater } = useQuery({
    queryKey: ['theater', id],
    queryFn: () => theatersApi.getById(id),
  })

  const { data: showtimesData, isLoading: loadingShowtimes } = useQuery({
    queryKey: ['showtimes', 'theater', id, selectedDate],
    queryFn: () => showtimesApi.getByTheater(id, selectedDate),
    enabled: Boolean(id),
  })

  const theater = theaterData?.data
  const showtimes = showtimesData?.data ?? []

  const groupedByMovie = React.useMemo(() => {
    const map = new Map<string, { movieId: string; title: string; showtimes: Showtime[] }>()
    showtimes.forEach((st) => {
      const key = st.movieId
      if (!map.has(key)) {
        map.set(key, { movieId: st.movieId, title: st.movieTitle ?? 'Movie', showtimes: [] })
      }
      map.get(key)!.showtimes.push(st)
    })
    return Array.from(map.values())
  }, [showtimes])

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      value: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    }
  })

  const isLoading = loadingTheater || loadingShowtimes

  return (
    <div className="container mx-auto px-4 py-8 md:px-8 max-w-5xl min-h-[calc(100vh-14rem)]">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/theatres">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-(--font-display) text-2xl font-bold">{theater?.name ?? 'Theatre'}</h1>
          {theater && (
            <p className="text-sm text-(--muted-foreground) mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {theater.address}, {theater.city}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div>
          <label className="block text-xs text-(--muted-foreground) mb-1">Pick a date</label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[180px]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar flex-1 min-w-0">
          {dates.map((date) => (
            <Button
              key={date.value}
              variant={selectedDate === date.value ? 'secondary' : 'outline'}
              className="shrink-0 flex flex-col h-auto py-3 px-4"
              onClick={() => setSelectedDate(date.value)}
              type="button"
            >
              <Calendar className="h-4 w-4 mb-1" />
              <span className="text-xs">{date.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
        </div>
      ) : groupedByMovie.length === 0 ? (
        <div className="text-center py-16 border border-(--border) rounded-2xl text-(--muted-foreground)">
          No showtimes for this date. Try another day.
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByMovie.map((group) => (
            <div key={group.movieId} className="border border-(--border) rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">{group.title}</h3>
              <div className="space-y-4">
                {Object.entries(
                  group.showtimes.reduce<Record<string, Showtime[]>>((acc, st) => {
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
                        <Link key={st.id} href={`/movie/${st.movieId}/seats?showtimeId=${st.id}`}>
                          <Button variant="outline" className="text-sm">
                            {new Date(st.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            <span className="ml-2 text-xs text-(--muted-foreground)">{st.screenName}</span>
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
