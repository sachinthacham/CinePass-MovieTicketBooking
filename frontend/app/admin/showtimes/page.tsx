'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { showtimesApi, showFormatsApi } from '@/lib/api/showtimes'
import { moviesApi } from '@/lib/api/movies'
import { theatersApi } from '@/lib/api/theaters'
import { languagesApi } from '@/lib/api/languages'
import { screensApi } from '@/lib/api/screens'
import { seatCategoriesApi } from '@/lib/api/seats'
import { cn } from '@/lib/utils'
import { statusBadgeClass, type StatusTone } from '@/lib/utils/statusBadge'
import type { Showtime } from '@/lib/types'

const showtimeSchema = z.object({
  movieId: z.string().min(1, 'Movie required'),
  screenId: z.string().min(1, 'Screen required'),
  showFormatId: z.string().min(1, 'Format required'),
  languageId: z.string().min(1, 'Language required'),
  startTime: z.string().min(1, 'Start time required'),
  pricing: z.array(
    z.object({
      seatCategoryId: z.string(),
      price: z.coerce.number().min(0),
    })
  ),
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShowtimeFormData = z.infer<typeof showtimeSchema> & { pricing: { seatCategoryId: string; price: number }[] }

export default function AdminShowtimesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [selectedTheaterId, setSelectedTheaterId] = React.useState('')
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().split('T')[0])

  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: languagesApi.getAll,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-showtimes', selectedTheaterId, selectedDate],
    queryFn: () => showtimesApi.getByTheater(selectedTheaterId, selectedDate),
    enabled: Boolean(selectedTheaterId),
  })

  const { data: moviesData } = useQuery({
    queryKey: ['movies-all'],
    queryFn: () => moviesApi.getAll({ pageSize: 100 }),
  })

  const { data: theatersData } = useQuery({
    queryKey: ['theaters-all'],
    queryFn: () => theatersApi.getAll({ pageSize: 100 }),
  })

  const { data: formatsData } = useQuery({
    queryKey: ['show-formats'],
    queryFn: () => showFormatsApi.getAll(),
  })

  const { data: screensData } = useQuery({
    queryKey: ['screens', selectedTheaterId],
    queryFn: () => screensApi.getByTheater(selectedTheaterId),
    enabled: Boolean(selectedTheaterId),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['seat-categories', selectedTheaterId],
    queryFn: () => seatCategoriesApi.getByTheater(selectedTheaterId),
    enabled: Boolean(selectedTheaterId),
  })

  const showtimes = data?.data ?? []
  const movies = moviesData?.data?.items ?? []
  const theaters = theatersData?.data?.items ?? []
  const languages = languagesData?.data ?? []

  React.useEffect(() => {
    if (!selectedTheaterId && theaters.length > 0) {
      setSelectedTheaterId(theaters[0].id)
    }
  }, [theaters, selectedTheaterId])
  const screens = screensData?.data ?? []
  const categories = categoriesData?.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control, watch } = useForm<ShowtimeFormData>({
    resolver: zodResolver(showtimeSchema) as any,
    defaultValues: { pricing: [], languageId: '' },
  })

  const { fields, replace } = useFieldArray({ control, name: 'pricing' })

  React.useEffect(() => {
    if (categories.length > 0) {
      replace(categories.map((c) => ({ seatCategoryId: c.id, price: c.basePrice })))
    }
  }, [categories, replace])

  const openCreate = () => {
    reset({
      pricing: [],
      languageId: languages[0]?.id ?? '',
      movieId: '',
      screenId: '',
      showFormatId: '',
      startTime: '',
    })
    setFormOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (d: ShowtimeFormData) => showtimesApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-showtimes'] })
      setFormOpen(false)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => showtimesApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-showtimes'] }),
  })

  const onSubmit = (d: ShowtimeFormData) => createMutation.mutate(d)

  const statusBadge = (status: Showtime['status']) => {
    const tone: Record<Showtime['status'], StatusTone> = {
      Scheduled: 'success',
      Cancelled: 'destructive',
      Completed: 'neutral',
    }
    return <Badge variant="secondary" className={cn('text-xs', statusBadgeClass(tone[status]))}>{status}</Badge>
  }

  const columns = [
    {
      key: 'movieTitle',
      header: 'Movie',
      render: (st: Showtime) => (
        <div>
          <p className="font-semibold">{st.movieTitle ?? '—'}</p>
          <p className="text-xs text-(--muted-foreground)">{st.theaterName} • {st.screenName}</p>
        </div>
      ),
    },
    {
      key: 'startTime',
      header: 'Date & Time',
      render: (st: Showtime) => (
        <div>
          <p className="text-sm">{new Date(st.startTime).toLocaleDateString()}</p>
          <p className="text-xs text-(--muted-foreground)">
            {new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ),
    },
    {
      key: 'showFormatName',
      header: 'Format',
      render: (st: Showtime) => st.showFormatName ?? '—',
    },
    {
      key: 'pricings',
      header: 'Pricing tiers',
      render: (st: Showtime) => (st.pricings?.length ? `${st.pricings.length}` : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (st: Showtime) => statusBadge(st.status),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold">Showtimes</h1>
          <p className="text-(--muted-foreground) mt-1">Schedule and manage movie showtimes</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-(--muted-foreground) mb-1">Date</label>
            <Input
              type="date"
              className="w-[160px]"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Showtime</Button>
        </div>
      </div>

      {selectedTheaterId && (
        <p className="text-sm text-(--muted-foreground)">
          Showing showtimes for{' '}
          <span className="font-medium text-(--foreground)">
            {theaters.find((t) => t.id === selectedTheaterId)?.name ?? 'this theater'}
          </span>{' '}
          on {new Date(selectedDate + 'T12:00:00').toLocaleDateString()}.
        </p>
      )}

      <DataTable
        columns={columns}
        data={showtimes}
        isLoading={isLoading}
        totalPages={1}
        currentPage={1}
        onPageChange={() => {}}
        actions={(st: Showtime) => (
          <>
            {st.status === 'Scheduled' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-(--destructive)"
                onClick={() => { if (confirm('Cancel showtime?')) cancelMutation.mutate(st.id) }}
              >
                <XCircle className="h-4 w-4 mr-1" />Cancel
              </Button>
            )}
          </>
        )}
      />

      {/* Create Showtime Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Schedule Showtime">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium mb-1">Movie *</label>
            <select className="w-full h-10 rounded-md border border-(--input) bg-(--background) px-3 text-sm outline-none focus:ring-1" {...register('movieId')}>
              <option value="">Select movie...</option>
              {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            {errors.movieId && <p className="mt-1 text-xs text-(--destructive)">{errors.movieId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Theater</label>
            <select
              className="w-full h-10 rounded-md border border-(--input) bg-(--background) px-3 text-sm outline-none focus:ring-1"
              value={selectedTheaterId}
              onChange={(e) => setSelectedTheaterId(e.target.value)}
            >
              <option value="">Select theater...</option>
              {theaters.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Screen *</label>
            <select
              className="w-full h-10 rounded-md border border-(--input) bg-(--background) px-3 text-sm outline-none focus:ring-1"
              {...register('screenId')}
              disabled={!selectedTheaterId}
            >
              <option value="">Select screen...</option>
              {screens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.screenId && <p className="mt-1 text-xs text-(--destructive)">{errors.screenId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Show Format *</label>
            <select className="w-full h-10 rounded-md border border-(--input) bg-(--background) px-3 text-sm outline-none focus:ring-1" {...register('showFormatId')}>
              <option value="">Select format...</option>
              {(formatsData?.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {errors.showFormatId && <p className="mt-1 text-xs text-(--destructive)">{errors.showFormatId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Language *</label>
            <select className="w-full h-10 rounded-md border border-(--input) bg-(--background) px-3 text-sm outline-none focus:ring-1" {...register('languageId')}>
              <option value="">Select language...</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
            {errors.languageId && <p className="mt-1 text-xs text-(--destructive)">{errors.languageId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
            <Input type="datetime-local" {...register('startTime')} />
            {errors.startTime && <p className="mt-1 text-xs text-(--destructive)">{errors.startTime.message}</p>}
          </div>

          {fields.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Pricing by Seat Category</label>
              <div className="space-y-2">
                {fields.map((field, idx) => {
                  const cat = categories.find((c) => c.id === field.seatCategoryId)
                  return (
                    <div key={field.id} className="flex items-center gap-3 border border-(--border) rounded-lg px-3 py-2">
                      <span className="text-sm font-medium flex-1">{cat?.name ?? 'Category'}</span>
                      <Input
                        type="number"
                        className="w-28"
                        {...register(`pricing.${idx}.price`)}
                      />
                      <span className="text-sm text-(--muted-foreground)">Rs.</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-(--border)">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {(isSubmitting || createMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Showtime
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
