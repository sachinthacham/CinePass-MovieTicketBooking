'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, Star, Eye, EyeOff, CheckCircle, X, Loader2, Upload
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { moviesApi } from '@/lib/api/movies'
import { genresApi } from '@/lib/api/genres'
import { languagesApi } from '@/lib/api/languages'
import { cn } from '@/lib/utils'
import { statusBadgeClass } from '@/lib/utils/statusBadge'
import type { Movie, Genre, Language, MovieReview } from '@/lib/types'

const movieSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(1, 'Duration required'),
  releaseDate: z.string().min(1, 'Release date required'),
  director: z.string().optional(),
  cast: z.string().optional(),
  certificateRating: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isComingSoon: z.boolean().optional(),
})


type MovieFormData = z.infer<typeof movieSchema> & { durationMinutes: number }

export default function AdminMoviesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Movie | null>(null)
  const [managing, setManaging] = React.useState<Movie | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-movies', debouncedSearch, page],
    queryFn: () => moviesApi.getAll({ search: debouncedSearch || undefined, pageNumber: page }),
  })

  const { data: genresData } = useQuery({ queryKey: ['genres'], queryFn: genresApi.getAll })
  const { data: languagesData } = useQuery({ queryKey: ['languages'], queryFn: languagesApi.getAll })

  const movies = data?.data?.items ?? []
  const totalPages = data?.data?.totalPages ?? 1
  const genres = genresData?.data ?? []
  const languages = languagesData?.data ?? []

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<MovieFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver's inferred type doesn't line up with useForm's generic here
    resolver: zodResolver(movieSchema) as any,
  })

  const openCreate = () => {
    setEditing(null)
    reset({})
    setFormOpen(true)
  }

  const openEdit = (movie: Movie) => {
    setEditing(movie)
    reset({
      title: movie.title,
      description: movie.description ?? '',
      durationMinutes: movie.durationMinutes,
      releaseDate: movie.releaseDate.split('T')[0],
      director: movie.director ?? '',
      cast: movie.cast ?? '',
      certificateRating: movie.certificateRating ?? '',
      isFeatured: movie.isFeatured,
      isComingSoon: movie.isComingSoon,
    })
    setFormOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: MovieFormData) => moviesApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-movies'] }); setFormOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MovieFormData }) => moviesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-movies'] }); setFormOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => moviesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-movies'] }),
  })

  const toggleFeaturedMutation = useMutation({
    mutationFn: (id: string) => moviesApi.toggleFeatured(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-movies'] }),
  })

  const toggleComingSoonMutation = useMutation({
    mutationFn: (id: string) => moviesApi.toggleComingSoon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-movies'] }),
  })

  const onSubmit = (data: MovieFormData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Movie',
      render: (m: Movie) => (
        <div>
          <p className="font-semibold">{m.title}</p>
          <p className="text-xs text-(--muted-foreground)">{m.genres.map((g) => g.name).join(', ')}</p>
        </div>
      ),
    },
    {
      key: 'releaseDate',
      header: 'Release',
      render: (m: Movie) => new Date(m.releaseDate).toLocaleDateString(),
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      render: (m: Movie) => `${Math.floor(m.durationMinutes / 60)}h ${m.durationMinutes % 60}m`,
    },
    {
      key: 'averageRating',
      header: 'Rating',
      render: (m: Movie) => (
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-(--primary) fill-(--primary)" />
          {m.averageRating != null ? m.averageRating.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m: Movie) => (
        <div className="flex gap-1 flex-wrap">
          {m.isFeatured && <Badge variant="secondary" className={cn('text-xs', statusBadgeClass('warning'))}>Featured</Badge>}
          {m.isComingSoon && <Badge variant="secondary" className={cn('text-xs', statusBadgeClass('info'))}>Coming Soon</Badge>}
          {m.isActive && <Badge variant="secondary" className={cn('text-xs', statusBadgeClass('success'))}>Active</Badge>}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold">Movies</h1>
          <p className="text-(--muted-foreground) mt-1">Manage your movie catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Movie
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={movies}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search movies..."
        onSearch={setSearch}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        actions={(movie) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Toggle Featured"
              onClick={() => toggleFeaturedMutation.mutate(movie.id)}
            >
              <Star className={`h-4 w-4 ${movie.isFeatured ? 'text-(--primary) fill-(--primary)' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Toggle Coming Soon"
              onClick={() => toggleComingSoonMutation.mutate(movie.id)}
            >
              {movie.isComingSoon ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setManaging(movie)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(movie)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-(--destructive) hover:text-(--destructive)"
              onClick={() => {
                if (confirm('Delete this movie?')) deleteMutation.mutate(movie.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit: ${editing.title}` : 'Add New Movie'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input {...register('title')} />
              {errors.title && <p className="mt-1 text-xs text-(--destructive)">{errors.title.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full bg-(--muted) rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-(--ring) resize-none min-h-[80px] border border-(--input)"
                {...register('description')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
              <Input type="number" {...register('durationMinutes')} />
              {errors.durationMinutes && <p className="mt-1 text-xs text-(--destructive)">{errors.durationMinutes.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Release Date *</label>
              <Input type="date" {...register('releaseDate')} />
              {errors.releaseDate && <p className="mt-1 text-xs text-(--destructive)">{errors.releaseDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Director</label>
              <Input {...register('director')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Certificate Rating</label>
              <Input placeholder="PG-13, R, U/A..." {...register('certificateRating')} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Cast</label>
              <Input placeholder="Actor 1, Actor 2..." {...register('cast')} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isFeatured')} className="w-4 h-4" />
                <span className="text-sm">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isComingSoon')} className="w-4 h-4" />
                <span className="text-sm">Coming Soon</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-(--border)">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editing ? 'Save Changes' : 'Create Movie'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Movie (genres, languages, trailers, posters, reviews) */}
      {managing && (
        <ManageMovieModal
          movie={managing}
          genres={genres}
          languages={languages}
          onClose={() => setManaging(null)}
        />
      )}
    </div>
  )
}

function ManageMovieModal({
  movie,
  genres,
  languages,
  onClose,
}: {
  movie: Movie
  genres: Genre[]
  languages: Language[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { data: fullMovieData } = useQuery({
    queryKey: ['movie', movie.id],
    queryFn: () => moviesApi.getById(movie.id),
  })

  const fullMovie = fullMovieData?.data ?? movie
  const reviews = fullMovie.reviews ?? []

  const addGenreMutation = useMutation({
    mutationFn: (genreId: string) => moviesApi.addGenre(movie.id, genreId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })
  const removeGenreMutation = useMutation({
    mutationFn: (genreId: string) => moviesApi.removeGenre(movie.id, genreId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })
  const addLanguageMutation = useMutation({
    mutationFn: (langId: string) => moviesApi.addLanguage(movie.id, langId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })
  const removeLanguageMutation = useMutation({
    mutationFn: (langId: string) => moviesApi.removeLanguage(movie.id, langId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })
  const approveReviewMutation = useMutation({
    mutationFn: (reviewId: string) => moviesApi.approveReview(movie.id, reviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })
  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => moviesApi.deleteReview(movie.id, reviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })

  const [trailerTitle, setTrailerTitle] = React.useState('')
  const [trailerUrl, setTrailerUrl] = React.useState('')

  const addTrailerMutation = useMutation({
    mutationFn: () =>
      moviesApi.addTrailer(movie.id, { title: trailerTitle, url: trailerUrl, isPrimary: fullMovie.trailers?.length === 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', movie.id] })
      setTrailerTitle('')
      setTrailerUrl('')
    },
  })

  const deleteTrailerMutation = useMutation({
    mutationFn: (tid: string) => moviesApi.deleteTrailer(movie.id, tid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })

  const posterInputRef = React.useRef<HTMLInputElement>(null)
  const uploadPosterMutation = useMutation({
    mutationFn: (file: File) => moviesApi.uploadPoster(movie.id, file, 'Portrait', fullMovie.posters?.length === 0),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })
  const deletePosterMutation = useMutation({
    mutationFn: (pid: string) => moviesApi.deletePoster(movie.id, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movie', movie.id] }),
  })

  const movieGenreIds = fullMovie.genres?.map((g) => g.id) ?? []
  const movieLanguageIds = fullMovie.languages?.map((l) => l.id) ?? []

  return (
    <Modal isOpen onClose={onClose} title={`Manage: ${movie.title}`}>
      <Tabs defaultValue="genres" className="mt-2">
        <TabsList className="mb-4 border-b border-(--border) bg-transparent p-0 rounded-none h-auto w-full justify-start">
          {['genres', 'languages', 'trailers', 'posters', 'reviews'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm capitalize"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="max-h-[60vh] overflow-y-auto">
          <TabsContent value="genres" className="space-y-2">
            <p className="text-sm text-(--muted-foreground) mb-3">Click to add/remove genres</p>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => {
                const active = movieGenreIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => active ? removeGenreMutation.mutate(g.id) : addGenreMutation.mutate(g.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                        : 'border-(--border) hover:border-(--primary)'
                    }`}
                  >
                    {active ? <X className="inline h-3 w-3 mr-1" /> : <Plus className="inline h-3 w-3 mr-1" />}
                    {g.name}
                  </button>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="languages" className="space-y-2">
            <p className="text-sm text-(--muted-foreground) mb-3">Click to add/remove languages</p>
            <div className="flex flex-wrap gap-2">
              {languages.map((l) => {
                const active = movieLanguageIds.includes(l.id)
                return (
                  <button
                    key={l.id}
                    onClick={() => active ? removeLanguageMutation.mutate(l.id) : addLanguageMutation.mutate(l.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                        : 'border-(--border) hover:border-(--primary)'
                    }`}
                  >
                    {active ? <X className="inline h-3 w-3 mr-1" /> : <Plus className="inline h-3 w-3 mr-1" />}
                    {l.name}
                  </button>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="trailers" className="space-y-4">
            <div className="space-y-2 rounded-lg border border-(--border) p-4">
              <p className="text-sm font-medium">Add Trailer</p>
              <Input placeholder="Title" value={trailerTitle} onChange={(e) => setTrailerTitle(e.target.value)} />
              <Input placeholder="YouTube URL" value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} />
              <Button
                size="sm"
                onClick={() => addTrailerMutation.mutate()}
                disabled={!trailerTitle || !trailerUrl || addTrailerMutation.isPending}
              >
                Add Trailer
              </Button>
            </div>
            <div className="space-y-2">
              {fullMovie.trailers?.map((t) => (
                <div key={t.id} className="flex items-center justify-between border border-(--border) rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-(--muted-foreground) truncate max-w-[250px]">{t.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-(--destructive)"
                    onClick={() => deleteTrailerMutation.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="posters" className="space-y-4">
            <div>
              <input
                ref={posterInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadPosterMutation.mutate(file)
                }}
              />
              <Button
                variant="outline"
                onClick={() => posterInputRef.current?.click()}
                disabled={uploadPosterMutation.isPending}
              >
                {uploadPosterMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload Poster
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {fullMovie.posters?.map((p) => (
                <div key={p.id} className="relative rounded-lg overflow-hidden aspect-[2/3] bg-(--muted)">
                  <img src={p.imageUrl ?? p.url} alt="Poster" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deletePosterMutation.mutate(p.id)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-(--destructive) text-(--destructive-foreground) flex items-center justify-center hover:bg-(--destructive)/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {p.isPrimary && (
                    <span className="absolute bottom-1 left-1 text-xs bg-(--primary) text-(--primary-foreground) px-1 rounded font-semibold">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-(--muted-foreground) text-sm text-center py-6">No reviews yet.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border border-(--border) rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{review.userName}</p>
                      <p className="text-xs text-(--muted-foreground)">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!review.isApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn('h-7 text-xs', statusBadgeClass('success'))}
                          onClick={() => approveReviewMutation.mutate(review.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-(--destructive) h-7 w-7"
                        onClick={() => deleteReviewMutation.mutate(review.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-(--muted-foreground)">{review.content}</p>
                  <Badge
                    variant="secondary"
                    className={statusBadgeClass(review.isApproved ? 'success' : 'warning')}
                  >
                    {review.isApproved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>
        </div>
      </Tabs>
    </Modal>
  )
}
