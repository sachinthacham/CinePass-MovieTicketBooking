'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { theatersApi } from '@/lib/api/theaters'
import { cn } from '@/lib/utils'

export default function TheatresPage() {
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [selectedCity, setSelectedCity] = React.useState('')
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const { data: citiesData } = useQuery({
    queryKey: ['theater-cities'],
    queryFn: theatersApi.getCities,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['theaters', debouncedSearch, selectedCity, page],
    queryFn: () =>
      theatersApi.getAll({
        search: debouncedSearch || undefined,
        city: selectedCity || undefined,
        pageNumber: page,
        pageSize: 10,
      }),
  })

  const theaters = data?.data?.items ?? []
  const totalPages = data?.data?.totalPages ?? 1
  const cities: string[] = citiesData?.data ?? []

  return (
    <div className="container mx-auto px-4 py-8 md:px-8 max-w-6xl min-h-[calc(100vh-14rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold tracking-tight">Theatres</h1>
          <p className="text-(--muted-foreground) mt-1 flex items-center">
            <MapPin className="mr-1 h-4 w-4" />
            {selectedCity ? selectedCity : 'All Locations'}
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-(--muted-foreground)" />
          <Input
            placeholder="Search theatres..."
            className="pl-9 w-full bg-(--background)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* City filter */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setSelectedCity(''); setPage(1) }}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              !selectedCity
                ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                : 'border-(--border) text-(--muted-foreground) hover:border-(--primary) hover:text-(--foreground)'
            )}
          >
            All Cities
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => { setSelectedCity(city); setPage(1) }}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                selectedCity === city
                  ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                  : 'border-(--border) text-(--muted-foreground) hover:border-(--primary) hover:text-(--foreground)'
              )}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Theatre List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))
        ) : theaters.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-(--border) rounded-2xl text-(--muted-foreground)">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No theatres found</p>
            {selectedCity && (
              <Button variant="link" onClick={() => setSelectedCity('')} className="mt-2">
                Clear city filter
              </Button>
            )}
          </div>
        ) : (
          theaters.map((theater) => (
            <div
              key={theater.id}
              className="border border-(--border) rounded-2xl p-6 bg-(--background) hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-bold">{theater.name}</h3>
                  <p className="text-sm text-(--muted-foreground) mt-1 flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                    {theater.address}, {theater.city}{theater.state ? `, ${theater.state}` : ''}
                  </p>
                  {theater.phoneNumber && (
                    <p className="text-sm text-(--muted-foreground) mt-0.5">{theater.phoneNumber}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="mb-2">
                    {theater.totalScreens} Screen{theater.totalScreens !== 1 ? 's' : ''}
                  </Badge>
                  {theater.averageRating > 0 && (
                    <div className="flex items-center justify-end text-sm font-medium text-(--primary)">
                      <Star className="h-4 w-4 fill-current mr-1" />
                      {theater.averageRating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>

              {theater.facilities && theater.facilities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-(--border) flex flex-wrap gap-2">
                  {theater.facilities.map((fac) => (
                    <span
                      key={fac.id}
                      className="text-xs px-2 py-1 rounded-md bg-(--muted) text-(--muted-foreground)"
                    >
                      {fac.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Link href={`/theatres/${theater.id}`}>
                  <Button variant="outline" size="sm">View Showtimes</Button>
                </Link>
              </div>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm self-center text-(--muted-foreground)">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
