'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notificationsApi } from '@/lib/api/notifications'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { Notification } from '@/lib/types'

function NotificationIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    BookingConfirmed: '🎬',
    BookingCancelled: '❌',
    Refund: '💰',
    Reminder: '⏰',
  }
  return <span className="text-2xl">{icons[type] ?? '🔔'}</span>
}

export default function NotificationsPage() {
  const [page, setPage] = React.useState(1)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi.getAll({ page, pageSize: 20 }),
  })

  const notifications: Notification[] = data?.data?.data?.items ?? []
  const unreadCount = data?.data?.data?.unreadCount ?? 0
  const totalCount = data?.data?.data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / 20)

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to mark as read.', variant: 'destructive' })
    },
  })

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds)
    }
  }

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate([id])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-(--primary) text-(--primary-foreground) text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-(--muted-foreground) text-sm mt-1">
            {totalCount} notification{totalCount !== 1 ? 's' : ''}
            {unreadCount > 0 && `, ${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-(--border) border-dashed rounded-2xl">
          <BellOff className="w-12 h-12 text-(--muted-foreground) mx-auto mb-4 opacity-50" />
          <h3 className="font-medium text-lg">No notifications</h3>
          <p className="text-(--muted-foreground) text-sm">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors hover:bg-(--muted)/30',
                notification.isRead
                  ? 'border-(--border) bg-(--background)'
                  : 'border-(--primary)/30 bg-(--primary)/5'
              )}
              onClick={() => !notification.isRead && handleMarkRead(notification.id)}
            >
              <div className="shrink-0 mt-0.5">
                <NotificationIcon type={notification.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('font-semibold text-sm', notification.isRead ? '' : 'text-(--primary)')}>
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-(--primary) shrink-0" />
                    )}
                    <span className="text-xs text-(--muted-foreground) whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-(--muted-foreground) mt-1 leading-relaxed">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-(--muted-foreground)">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
