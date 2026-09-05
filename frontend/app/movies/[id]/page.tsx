'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Star, Clock, Share2, Heart, Calendar, Loader2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { StarRating } from '@/components/ui/StarRating'
import { moviesApi } from '@/lib/api/movies'
import { showtimesApi } from '@/lib/api/showtimes'
import { useAuthStore } from '@/lib/stores/authStore'
import { getUploadsBase, resolveAssetUrl } from '@/lib/utils/posterUrl'

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [reviewText, setReviewText] = React.useState('')
  const [userRating, setUserRating] = React.useState(0)

  const { data: movieData, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesApi.getById(id),
  })

  const { data: showtimesData } = useQuery({
    queryKey: ['showtimes', id],
    // Do not restrict to "today" (UTC) here, otherwise future local showtimes
    // can be hidden and the booking CTA appears incorrectly disabled.
    queryFn: () => showtimesApi.getByMovie(id),
  })

  const rateMutation = useMutation({
    mutationFn: () => moviesApi.rateMovie(id, userRating),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', id] }),
  })

  const reviewMutation = useMutation({
    mutationFn: () => moviesApi.addReview(id, reviewText),
    onSuccess: () => {
      setReviewText('')
      queryClient.invalidateQueries({ queryKey: ['movie', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="h-80 bg-(--muted) animate-pulse" />
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  const movie = movieData?.data
  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="w-16 h-16 rounded-full bg-(--muted) flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-(--muted-foreground)" />
        </div>
        <h1 className="font-(--font-display) text-xl font-bold">Movie not found</h1>
        <p className="text-(--muted-foreground) mt-2 max-w-sm">
          This movie may have been removed or the link is incorrect.
        </p>
        <Link href="/movies" className="mt-6">
          <Button>Browse movies</Button>
        </Link>
      </div>
    )
  }

  const uploadsBase = getUploadsBase()
  const primaryPoster = movie.posters?.find((p) => p.isPrimary) ?? movie.posters?.[0]
  const posterUrl = resolveAssetUrl(primaryPoster?.imageUrl ?? primaryPoster?.url, uploadsBase)
  const primaryTrailer = movie.trailers?.find((t) => t.isPrimary) ?? movie.trailers?.[0]
  const approvedReviews = (movie.reviews ?? []).filter((r) => r.isApproved)
  const showtimes = showtimesData?.data ?? []

  const durationHours = Math.floor(movie.durationMinutes / 60)
  const durationMins = movie.durationMinutes % 60
  const durationStr = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins}m`

  return (
    <div className="flex flex-col min-h-screen bg-(--background)">
      {/* Movie Banner */}
      <section className="relative w-full overflow-hidden bg-black/90 pt-16 pb-12 md:py-24">
        <div className="absolute inset-0 z-0 opacity-40">
          <div
            className="h-full w-full bg-cover bg-center blur-xl transform scale-110"
            style={{ backgroundImage: `url(${posterUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="shrink-0">
              <div className="relative overflow-hidden rounded-xl shadow-2xl bg-(--muted) w-64 md:w-72 aspect-[2/3]">
                <Image src={posterUrl} alt={movie.title} fill sizes="288px" className="object-cover" priority />
              </div>
            </div>

            <div className="flex-1 text-white space-y-6 text-center md:text-left">
              <div>
                <h1 className="font-(--font-display) text-3xl md:text-5xl font-extrabold tracking-tight">{movie.title}</h1>
                {movie.certificateRating && (
                  <span className="inline-block mt-2 px-2 py-0.5 border border-white/40 text-xs text-white/70 rounded">
                    {movie.certificateRating}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-md w-fit mx-auto md:mx-0">
                <div className="flex items-center space-x-2">
                  <Star className="h-6 w-6 text-(--primary) fill-(--primary)" />
                  <span className="text-2xl font-bold">
                    {movie.averageRating != null ? movie.averageRating.toFixed(1) : '—'}/10
                  </span>
                  <span className="text-sm opacity-80">{movie.totalRatings} Votes</span>
                </div>
                {isAuthenticated && (
                  <>
                    <div className="hidden sm:block w-px h-8 bg-white/20" />
                    <div className="flex flex-col items-center gap-1">
                      <StarRating
                        value={userRating}
                        max={10}
                        onChange={setUserRating}
                        size="sm"
                      />
                      <Button
                        variant="secondary"
                        className="whitespace-nowrap rounded-full text-xs h-7"
                        onClick={() => rateMutation.mutate()}
                        disabled={userRating === 0 || rateMutation.isPending}
                      >
                        Rate now
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {(movie.genres ?? []).map((g) => (
                  <Badge key={g.id} variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                    {g.name}
                  </Badge>
                ))}
                {(movie.languages ?? []).map((l) => (
                  <Badge key={l.id} variant="secondary" className="bg-white text-black hover:bg-white/90">
                    {l.name}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm opacity-90">
                <span className="flex items-center"><Clock className="mr-1 h-4 w-4" />{durationStr}</span>
                {movie.director && <span>• Dir: {movie.director}</span>}
                <span className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(movie.releaseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="pt-4 flex items-center justify-center md:justify-start space-x-4">
                {showtimes.length > 0 ? (
                  <Link href={`/movie/${movie.id}/showtimes`}>
                    <Button size="lg" className="rounded-full px-8 bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90">
                      Book Tickets
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" disabled className="rounded-full px-8">
                    No Showtimes
                  </Button>
                )}
                <Button size="icon" variant="outline" className="rounded-full bg-white/10 border-none hover:bg-white/20">
                  <Heart className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="outline" className="rounded-full bg-white/10 border-none hover:bg-white/20">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Tabs */}
      <section className="container mx-auto px-4 md:px-8 py-8 flex-1 max-w-5xl">
        <Tabs defaultValue="overview">
          <TabsList className="mb-8 w-full justify-start border-b border-(--border) bg-transparent p-0 rounded-none h-auto">
            {['overview', 'cast', 'reviews', 'showtimes'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 capitalize"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {movie.description && (
              <div>
                <h3 className="text-xl font-bold mb-4">About the Movie</h3>
                <p className="text-(--muted-foreground) leading-relaxed">{movie.description}</p>
              </div>
            )}

            {primaryTrailer && (
              <div>
                <h3 className="text-xl font-bold mb-4">Trailer</h3>
                <a
                  href={primaryTrailer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-(--muted) flex items-center justify-center group cursor-pointer border border-(--border)">
                    {primaryTrailer.thumbnailUrl ? (
                      <img
                        src={resolveAssetUrl(primaryTrailer.thumbnailUrl, uploadsBase)}
                        alt="Trailer Thumbnail"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      />
                    ) : null}
                    <div className="relative z-10 w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </a>
              </div>
            )}

            {movie.posters && movie.posters.length > 1 && (
              <div>
                <h3 className="text-xl font-bold mb-4">Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {movie.posters.slice(0, 6).map((poster) => (
                    <div key={poster.id} className="rounded-lg overflow-hidden aspect-video bg-(--muted)">
                      <img
                        src={resolveAssetUrl(poster.imageUrl ?? poster.url, uploadsBase)}
                        alt="Poster"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cast" className="animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xl font-bold mb-6">Cast & Crew</h3>
            {movie.director && (
              <p className="text-(--muted-foreground) mb-4"><strong>Director:</strong> {movie.director}</p>
            )}
            {movie.cast && (
              <p className="text-(--muted-foreground)"><strong>Cast:</strong> {movie.cast}</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Reviews</h3>
            </div>

            {isAuthenticated && (
              <div className="mb-8 space-y-3 rounded-xl border border-(--border) p-4">
                <h4 className="font-semibold">Write a Review</h4>
                <textarea
                  className="w-full bg-(--muted) rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-(--ring) resize-none min-h-[80px]"
                  placeholder="Share your thoughts..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!reviewText.trim() || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                >
                  {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Review
                </Button>
              </div>
            )}

            {approvedReviews.length === 0 ? (
              <p className="text-(--muted-foreground) text-center py-8">No reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-4">
                {approvedReviews.map((r) => (
                  <div key={r.id} className="border border-(--border) p-6 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-(--muted) flex items-center justify-center font-bold text-sm">
                          {r.userName?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{r.userName}</p>
                          <p className="text-xs text-(--muted-foreground)">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-(--muted-foreground)">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="showtimes" className="animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xl font-bold mb-6">Available Showtimes</h3>
            {showtimes.length === 0 ? (
              <p className="text-(--muted-foreground) text-center py-8">No showtimes currently scheduled.</p>
            ) : (
              <div className="space-y-4">
                {showtimes.map((showtime) => (
                  <div key={showtime.id} className="border border-(--border) rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{showtime.theaterName}</p>
                      <p className="text-sm text-(--muted-foreground)">
                        {showtime.screenName} • {showtime.showFormatName}
                      </p>
                      <p className="text-sm mt-1">
                        {new Date(showtime.startTime).toLocaleDateString()} at{' '}
                        {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Link href={`/movie/${movie.id}/seats?showtimeId=${showtime.id}`}>
                        <Button size="sm" className="mt-2">Book</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
