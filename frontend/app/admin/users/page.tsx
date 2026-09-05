'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, UserCheck, UserX, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/DataTable'
import { adminUsersApi } from '@/lib/api/adminUsers'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { statusBadgeClass } from '@/lib/utils/statusBadge'
import type { UserAdmin } from '@/lib/types'

const ROLES = ['All', 'Admin', 'User']

function UserDetailModal({ user, onClose }: { user: UserAdmin; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = React.useState(user.role)

  const updateRoleMutation = useMutation({
    mutationFn: () => adminUsersApi.updateRole(user.id, selectedRole),
    onSuccess: () => {
      toast({ title: 'Role updated', description: `${user.fullName}'s role changed to ${selectedRole}.` })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: () => {
      toast({ title: 'Failed', description: 'Could not update role.', variant: 'destructive' })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: () => user.isActive ? adminUsersApi.deactivate(user.id) : adminUsersApi.activate(user.id),
    onSuccess: () => {
      toast({
        title: user.isActive ? 'User deactivated' : 'User activated',
        description: `${user.fullName} has been ${user.isActive ? 'deactivated' : 'activated'}.`,
      })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: () => {
      toast({ title: 'Failed', description: 'Could not update user status.', variant: 'destructive' })
    },
  })

  return (
    <Modal isOpen onClose={onClose} title="User Management">
      <div className="space-y-6">
        {/* User info */}
        <div className="flex items-center gap-4">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.fullName} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-(--primary)/20 text-(--primary) flex items-center justify-center font-bold text-xl">
              {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-lg">{user.fullName}</h3>
            <p className="text-(--muted-foreground) text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                statusBadgeClass(user.isActive ? 'success' : 'destructive')
              )}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs bg-(--muted) text-(--muted-foreground) px-2 py-0.5 rounded-full">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-(--muted)/50 rounded-xl p-4 border border-(--border)">
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide">Total Bookings</p>
            <p className="font-bold text-2xl mt-1">{user.totalBookings}</p>
          </div>
          <div className="bg-(--muted)/50 rounded-xl p-4 border border-(--border)">
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide">Total Spent</p>
            <p className="font-bold text-2xl mt-1 text-(--primary)">Rs. {user.totalSpent}</p>
          </div>
        </div>

        <div className="text-sm text-(--muted-foreground)">
          Joined: {new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
          {user.socialProvider && ` • via ${user.socialProvider}`}
        </div>

        {/* Change Role */}
        <div className="border-t border-(--border) pt-4 space-y-3">
          <h4 className="font-semibold">Change Role</h4>
          <div className="flex gap-2">
            {['User', 'Admin'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  selectedRole === role
                    ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                    : 'border-(--border) text-(--muted-foreground) hover:border-(--primary)'
                )}
              >
                {role === 'Admin' ? <Shield className="h-4 w-4 inline mr-1" /> : <User className="h-4 w-4 inline mr-1" />}
                {role}
              </button>
            ))}
          </div>
          {selectedRole !== user.role && (
            <Button
              className="w-full"
              onClick={() => updateRoleMutation.mutate()}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update to {selectedRole}
            </Button>
          )}
        </div>

        {/* Activate / Deactivate */}
        <div className="border-t border-(--border) pt-4">
          <Button
            variant="outline"
            className={cn(
              'w-full',
              user.isActive
                ? 'text-(--destructive) border-(--destructive)/30 hover:bg-(--destructive)/10'
                : 'text-(--success) border-(--success)/30 hover:bg-(--success)/10'
            )}
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            {toggleActiveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : user.isActive ? (
              <UserX className="h-4 w-4 mr-2" />
            ) : (
              <UserCheck className="h-4 w-4 mr-2" />
            )}
            {user.isActive ? 'Deactivate User' : 'Activate User'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('All')
  const [page, setPage] = React.useState(1)
  const [selectedUser, setSelectedUser] = React.useState<UserAdmin | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, page],
    queryFn: () => adminUsersApi.getAll({
      page,
      pageSize: 15,
      role: roleFilter !== 'All' ? roleFilter : undefined,
    }),
  })

  const users: UserAdmin[] = data?.data?.data?.items ?? []
  const totalCount = data?.data?.data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / 15)

  const filtered = search
    ? users.filter((u) =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const columns = [
    {
      key: 'fullName',
      header: 'User',
      render: (u: UserAdmin) => (
        <div className="flex items-center gap-3">
          {u.profileImageUrl ? (
            <img src={u.profileImageUrl} alt={u.fullName} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-(--primary)/20 text-(--primary) flex items-center justify-center font-bold text-sm">
              {u.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{u.fullName}</p>
            <p className="text-xs text-(--muted-foreground)">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: UserAdmin) => (
        <span className={cn(
          'text-xs px-2 py-1 rounded border font-medium',
          u.role === 'Admin'
            ? 'bg-(--primary)/10 text-(--primary) border-(--primary)/20'
            : 'bg-(--muted) text-(--muted-foreground) border-(--border)'
        )}>
          {u.role}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (u: UserAdmin) => (
        <span className={cn(
          'text-xs px-2 py-1 rounded border font-medium',
          u.isActive
            ? 'bg-(--success)/10 text-(--success) border-(--success)/20'
            : 'bg-(--destructive)/10 text-(--destructive) border-(--destructive)/20'
        )}>
          {u.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'totalBookings',
      header: 'Bookings',
      render: (u: UserAdmin) => <span className="font-medium">{u.totalBookings}</span>,
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (u: UserAdmin) => <span className="font-medium text-(--primary)">Rs. {u.totalSpent}</span>,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (u: UserAdmin) => (
        <span className="text-sm text-(--muted-foreground)">
          {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(--font-display) text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-(--muted-foreground) text-sm mt-1">
          {totalCount} registered user{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--muted-foreground)" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                roleFilter === r
                  ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                  : 'border-(--border) text-(--muted-foreground) hover:border-(--primary)'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No users found."
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        actions={(u) => (
          <Button size="sm" variant="ghost" onClick={() => setSelectedUser(u)}>
            Manage
          </Button>
        )}
      />

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  )
}
