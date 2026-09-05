'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/DataTable'
import { genresApi } from '@/lib/api/genres'
import type { Genre } from '@/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
})
type FormData = z.infer<typeof schema>

export default function AdminGenresPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Genre | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['genres'], queryFn: genresApi.getAll })
  const genres = data?.data ?? []

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => { setEditing(null); reset({}); setFormOpen(true) }
  const openEdit = (g: Genre) => { setEditing(g); reset({ name: g.name, slug: g.slug }); setFormOpen(true) }

  const createMutation = useMutation({
    mutationFn: (d: FormData) => genresApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['genres'] }); setFormOpen(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => genresApi.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['genres'] }); setFormOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => genresApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['genres'] }),
  })

  const onSubmit = (d: FormData) => {
    if (editing) updateMutation.mutate({ id: editing.id, d })
    else createMutation.mutate(d)
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug', render: (g: Genre) => <code className="text-xs bg-(--muted) px-1 py-0.5 rounded">{g.slug}</code> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold">Genres</h1>
          <p className="text-(--muted-foreground) mt-1">Manage movie genres</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Genre</Button>
      </div>

      <DataTable
        columns={columns}
        data={genres}
        isLoading={isLoading}
        actions={(g: Genre) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
            <Button
              variant="ghost" size="icon" className="text-(--destructive)"
              onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(g.id) }}
            ><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Genre' : 'Add Genre'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-(--destructive)">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <Input placeholder="action, sci-fi..." {...register('slug')} />
            {errors.slug && <p className="mt-1 text-xs text-(--destructive)">{errors.slug.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {(isSubmitting || createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
