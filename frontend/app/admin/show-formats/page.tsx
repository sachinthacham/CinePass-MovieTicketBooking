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
import { showFormatsApi } from '@/lib/api/showtimes'
import type { ShowFormat } from '@/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function AdminShowFormatsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ShowFormat | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['all-show-formats'],
    queryFn: showFormatsApi.getAll,
  })

  const formats = data?.data ?? []

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => { setEditing(null); reset({}); setFormOpen(true) }
  const openEdit = (f: ShowFormat) => { setEditing(f); reset({ name: f.name, description: f.description ?? '' }); setFormOpen(true) }

  const createMutation = useMutation({
    mutationFn: (d: FormData) => showFormatsApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-show-formats'] }); setFormOpen(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => showFormatsApi.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-show-formats'] }); setFormOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => showFormatsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-show-formats'] }),
  })

  const onSubmit = (d: FormData) => {
    if (editing) updateMutation.mutate({ id: editing.id, d })
    else createMutation.mutate(d)
  }

  const columns = [
    { key: 'name', header: 'Format Name' },
    { key: 'description', header: 'Description', render: (f: ShowFormat) => f.description ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold">Show Formats</h1>
          <p className="text-(--muted-foreground) mt-1">Manage IMAX, 4DX, 2D, 3D and other formats</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Format</Button>
      </div>

      <DataTable
        columns={columns}
        data={formats}
        isLoading={isLoading}
        actions={(f: ShowFormat) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
            <Button
              variant="ghost" size="icon" className="text-(--destructive)"
              onClick={() => { if (confirm('Delete format?')) deleteMutation.mutate(f.id) }}
            ><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Format' : 'Add Show Format'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input placeholder="IMAX 3D, 4DX, 2D..." {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-(--destructive)">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input placeholder="Short description..." {...register('description')} />
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
