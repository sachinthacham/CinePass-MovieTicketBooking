'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Loader2, Upload, X, Star } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/DataTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { theatersApi } from '@/lib/api/theaters'
import { screensApi } from '@/lib/api/screens'
import { seatCategoriesApi } from '@/lib/api/seats'
import type { Theater, Screen, SeatCategory } from '@/lib/types'

const theaterSchema = z.object({
  name: z.string().min(1, 'Name required'),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  country: z.string().min(1, 'Country required'),
  zipCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

const screenSchema = z.object({
  name: z.string().min(1, 'Name required'),
  totalRows: z.coerce.number().min(1),
  totalColumns: z.coerce.number().min(1),
})

const categorySchema = z.object({
  name: z.string().min(1, 'Name required'),
  basePrice: z.coerce.number().min(0),
  colorCode: z.string().optional(),
  description: z.string().optional(),
})

const facilitySchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
})

type TheaterFormData = z.infer<typeof theaterSchema>
type ScreenFormData = { name: string; totalRows: number; totalColumns: number }
type CategoryFormData = { name: string; basePrice: number; colorCode?: string; description?: string }
type FacilityFormData = z.infer<typeof facilitySchema>

export default function AdminTheatersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Theater | null>(null)
  const [managing, setManaging] = React.useState<Theater | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-theaters', page],
    queryFn: () => theatersApi.getAll({ pageNumber: page }),
  })

  const theaters = data?.data?.items ?? []
  const totalPages = data?.data?.totalPages ?? 1

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<TheaterFormData>({
    resolver: zodResolver(theaterSchema),
  })

  const openCreate = () => { setEditing(null); reset({}); setFormOpen(true) }
  const openEdit = (t: Theater) => {
    setEditing(t)
    reset({ name: t.name, address: t.address, city: t.city, state: t.state, country: t.country, zipCode: t.zipCode ?? '', phoneNumber: t.phoneNumber ?? '', email: t.email ?? '' })
    setFormOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (d: TheaterFormData) => theatersApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }); setFormOpen(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: TheaterFormData }) => theatersApi.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }); setFormOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => theatersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }),
  })

  const onSubmit = (d: TheaterFormData) => {
    if (editing) updateMutation.mutate({ id: editing.id, d })
    else createMutation.mutate(d)
  }

  const columns = [
    {
      key: 'name',
      header: 'Theater',
      render: (t: Theater) => (
        <div>
          <p className="font-semibold">{t.name}</p>
          <p className="text-xs text-(--muted-foreground)">{t.city}, {t.state}</p>
        </div>
      ),
    },
    { key: 'address', header: 'Address' },
    { key: 'totalScreens', header: 'Screens' },
    {
      key: 'averageRating',
      header: 'Rating',
      render: (t: Theater) => (
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-(--primary) fill-(--primary)" />
          {t.averageRating.toFixed(1)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold">Theaters</h1>
          <p className="text-(--muted-foreground) mt-1">Manage venues and screens</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Theater</Button>
      </div>

      <DataTable
        columns={columns}
        data={theaters}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        actions={(t: Theater) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => setManaging(t)}>Manage</Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
            <Button
              variant="ghost" size="icon" className="text-(--destructive)"
              onClick={() => { if (confirm('Delete theater?')) deleteMutation.mutate(t.id) }}
            ><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit: ${editing.name}` : 'Add Theater'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-(--destructive)">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Address *</label>
              <Input {...register('address')} />
              {errors.address && <p className="mt-1 text-xs text-(--destructive)">{errors.address.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <Input {...register('city')} />
              {errors.city && <p className="mt-1 text-xs text-(--destructive)">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <Input {...register('state')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country *</label>
              <Input {...register('country')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zip Code</label>
              <Input {...register('zipCode')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input {...register('phoneNumber')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input type="email" {...register('email')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-(--border)">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {(isSubmitting || createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Theater'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Theater Modal */}
      {managing && (
        <ManageTheaterModal theater={managing} onClose={() => setManaging(null)} />
      )}
    </div>
  )
}

function ManageTheaterModal({ theater, onClose }: { theater: Theater; onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: screensData } = useQuery({
    queryKey: ['screens', theater.id],
    queryFn: () => screensApi.getByTheater(theater.id),
  })
  const { data: catsData } = useQuery({
    queryKey: ['seat-categories', theater.id],
    queryFn: () => seatCategoriesApi.getByTheater(theater.id),
  })

  const screens = screensData?.data ?? []
  const categories = catsData?.data ?? []

  // Screen form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const screenForm = useForm<ScreenFormData>({ resolver: zodResolver(screenSchema) as any })
  const createScreenMutation = useMutation({
    mutationFn: (d: ScreenFormData) => screensApi.create({ theaterId: theater.id, ...d }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['screens', theater.id] }); screenForm.reset() },
  })
  const deleteScreenMutation = useMutation({
    mutationFn: (id: string) => screensApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['screens', theater.id] }),
  })

  // Category form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catForm = useForm<CategoryFormData>({ resolver: zodResolver(categorySchema) as any })
  const createCatMutation = useMutation({
    mutationFn: (d: CategoryFormData) => seatCategoriesApi.create({ theaterId: theater.id, ...d }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seat-categories', theater.id] }); catForm.reset() },
  })
  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => seatCategoriesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seat-categories', theater.id] }),
  })

  // Facility form
  const facilityForm = useForm<FacilityFormData>({ resolver: zodResolver(facilitySchema) })
  const addFacilityMutation = useMutation({
    mutationFn: (d: FacilityFormData) => theatersApi.addFacility(theater.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }); facilityForm.reset() },
  })
  const deleteFacilityMutation = useMutation({
    mutationFn: (id: string) => theatersApi.deleteFacility(theater.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }),
  })

  // Image upload
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => theatersApi.uploadImage(theater.id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }),
  })
  const deleteImageMutation = useMutation({
    mutationFn: (id: string) => theatersApi.deleteImage(theater.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-theaters'] }),
  })

  return (
    <Modal isOpen onClose={onClose} title={`Manage: ${theater.name}`}>
      <Tabs defaultValue="screens" className="mt-2">
        <TabsList className="mb-4 border-b border-(--border) bg-transparent p-0 rounded-none h-auto w-full justify-start">
          {['screens', 'categories', 'facilities', 'images'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm capitalize"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          <TabsContent value="screens" className="space-y-4">
            <form onSubmit={screenForm.handleSubmit((d) => createScreenMutation.mutate(d))} className="border border-(--border) rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Add Screen</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input placeholder="Name (e.g. Screen 1)" {...screenForm.register('name')} />
                  {screenForm.formState.errors.name && <p className="text-xs text-(--destructive) mt-1">{screenForm.formState.errors.name.message}</p>}
                </div>
                <Input type="number" placeholder="Rows" {...screenForm.register('totalRows')} />
                <Input type="number" placeholder="Columns" {...screenForm.register('totalColumns')} />
              </div>
              <Button type="submit" size="sm" disabled={createScreenMutation.isPending}>
                {createScreenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Screen
              </Button>
            </form>
            <div className="space-y-2">
              {screens.map((s: Screen) => (
                <div key={s.id} className="flex items-center justify-between border border-(--border) rounded-lg px-3 py-2">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-(--muted-foreground)">{s.totalRows} rows × {s.totalColumns} cols • {s.totalSeats} seats</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-(--destructive)" onClick={() => deleteScreenMutation.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <form onSubmit={catForm.handleSubmit((d) => createCatMutation.mutate(d))} className="border border-(--border) rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Add Seat Category</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name (VIP, Premium...)" {...catForm.register('name')} />
                <Input type="number" placeholder="Base Price" {...catForm.register('basePrice')} />
                <Input placeholder="Color (e.g. #a855f7)" {...catForm.register('colorCode')} />
                <Input placeholder="Description" {...catForm.register('description')} />
              </div>
              <Button type="submit" size="sm" disabled={createCatMutation.isPending}>Add Category</Button>
            </form>
            <div className="space-y-2">
              {categories.map((c: SeatCategory) => (
                <div key={c.id} className="flex items-center justify-between border border-(--border) rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    {c.colorCode && <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.colorCode }} />}
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-(--muted-foreground)">Base: Rs. {c.basePrice}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-(--destructive)" onClick={() => deleteCatMutation.mutate(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="facilities" className="space-y-4">
            <form onSubmit={facilityForm.handleSubmit((d) => addFacilityMutation.mutate(d))} className="border border-(--border) rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Add Facility</p>
              <Input placeholder="Facility name (Parking, IMAX...)" {...facilityForm.register('name')} />
              <Input placeholder="Description (optional)" {...facilityForm.register('description')} />
              <Button type="submit" size="sm" disabled={addFacilityMutation.isPending}>Add</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {theater.facilities?.map((f) => (
                <span key={f.id} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border border-(--border) bg-(--muted)">
                  {f.name}
                  <button onClick={() => deleteFacilityMutation.mutate(f.id)} className="ml-1 text-(--muted-foreground) hover:text-(--destructive)">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div>
              <input ref={imageInputRef} type="file" accept="image/*" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImageMutation.mutate(f) }}
              />
              <Button variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploadImageMutation.isPending}>
                {uploadImageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Image
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {theater.images?.map((img) => (
                <div key={img.id} className="relative rounded-lg overflow-hidden aspect-video bg-(--muted)">
                  <img src={img.url} alt={img.caption ?? 'Theater'} className="w-full h-full object-cover" />
                  <button onClick={() => deleteImageMutation.mutate(img.id)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-(--destructive) text-(--destructive-foreground) flex items-center justify-center hover:bg-(--destructive)/90">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Modal>
  )
}
