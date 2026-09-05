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
import { languagesApi } from '@/lib/api/languages'
import type { Language } from '@/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(2, 'Code required (e.g. en)'),
})
type FormData = z.infer<typeof schema>

export default function AdminLanguagesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Language | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['languages'], queryFn: languagesApi.getAll })
  const languages = data?.data ?? []

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => { setEditing(null); reset({}); setFormOpen(true) }
  const openEdit = (l: Language) => { setEditing(l); reset({ name: l.name, code: l.code }); setFormOpen(true) }

  const createMutation = useMutation({
    mutationFn: (d: FormData) => languagesApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['languages'] }); setFormOpen(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => languagesApi.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['languages'] }); setFormOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => languagesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['languages'] }),
  })

  const onSubmit = (d: FormData) => {
    if (editing) updateMutation.mutate({ id: editing.id, d })
    else createMutation.mutate(d)
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code', render: (l: Language) => <code className="text-xs bg-(--muted) px-1 py-0.5 rounded">{l.code}</code> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-3xl font-bold">Languages</h1>
          <p className="text-(--muted-foreground) mt-1">Manage movie languages</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Language</Button>
      </div>

      <DataTable
        columns={columns}
        data={languages}
        isLoading={isLoading}
        actions={(l: Language) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
            <Button
              variant="ghost" size="icon" className="text-(--destructive)"
              onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(l.id) }}
            ><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Language' : 'Add Language'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input placeholder="English, Hindi..." {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-(--destructive)">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <Input placeholder="en, hi, ta..." {...register('code')} />
            {errors.code && <p className="mt-1 text-xs text-(--destructive)">{errors.code.message}</p>}
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
