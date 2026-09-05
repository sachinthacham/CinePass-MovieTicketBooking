'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { MovieCard } from '@/components/ui/MovieCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { moviesApi } from '@/lib/api/movies'
import { genresApi } from '@/lib/api/genres'
import { languagesApi } from '@/lib/api/languages'
import { Button } from '@/components/ui/Button'
import type { Genre, Language, Movie } from '@/lib/types'

function MoviesBrowseContent() {
  const searchParams = useSearchParams()
  const comingSoonOnly = searchParams.get('comingSoon') === 'true'
  const searchQuery = searchParams.get('search') ?? ''

  const [selectedGenre, setSelectedGenre] = React.useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['movies', 'browse', comingSoonOnly, selectedGenre, selectedLanguage, searchQuery],
    queryFn: () =>
      moviesApi.getAll({
        isComingSoon: comingSoonOnly,
        genreId: selectedGenre || undefined,
        languageId: selectedLanguage || undefined,
        search: searchQuery || undefined,
        pageSize: 48,
      }),
  })

  const { data: genresData } = useQuery({ queryKey: ['genres'], queryFn: genresApi.getAll })
  const { data: languagesData } = useQuery({ queryKey: ['languages'], queryFn: languagesApi.getAll })

  const items = data?.data?.items ?? []
  const genres = genresData?.data ?? []
  const languages = languagesData?.data ?? []

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-(--muted-foreground) hover:text-(--primary)"
            >
              <ChevronLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-(--font-display) text-3xl font-bold tracking-tight md:text-4xl">
              {searchQuery ? `Results for "${searchQuery}"` : comingSoonOnly ? 'Coming soon' : 'All movies'}
            </h1>
            <p className="mt-2 text-(--muted-foreground)">
              {searchQuery
                ? `${items.length} movie${items.length === 1 ? '' : 's'} found`
                : comingSoonOnly
                ? 'Upcoming releases you can bookmark.'
                : 'Browse every title currently on sale.'}
            </p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-(--border) pb-6">
          <span className="text-sm font-medium text-(--muted-foreground) w-full sm:w-auto">Language</span>
          <Button
            variant={selectedLanguage === '' ? 'secondary' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setSelectedLanguage('')}
          >
            All
          </Button>
          {languages.map((lang: Language) => (
            <Button
              key={lang.id}
              variant={selectedLanguage === lang.id ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedLanguage(lang.id)}
            >
              {lang.name}
            </Button>
          ))}
        </div>

        <div className="mb-10 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-(--muted-foreground) w-full sm:w-auto">Genre</span>
          <Button
            variant={selectedGenre === '' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => setSelectedGenre('')}
          >
            All
          </Button>
          {genres.map((genre: Genre) => (
            <Button
              key={genre.id}
              variant={selectedGenre === genre.id ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedGenre(genre.id)}
            >
              {genre.name}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-(--muted-foreground)">No movies match your filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((movie: Movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MoviesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen pt-24 pb-16">
          <div className="container mx-auto px-4">
            <Skeleton className="mb-8 h-10 w-64" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <MoviesBrowseContent />
    </React.Suspense>
  )
}
