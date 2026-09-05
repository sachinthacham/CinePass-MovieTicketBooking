'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ticket, QrCode, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { bookingsApi } from '@/lib/api/bookings'
import { ticketsApi } from '@/lib/api/tickets'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { statusBadgeClass, type StatusTone } from '@/lib/utils/statusBadge'
import type { Booking, TicketDto, BookingStatus } from '@/lib/types'

const STATUS_TONE: Record<BookingStatus, StatusTone> = {
  Confirmed: 'success',
  Pending: 'warning',
  Cancelled: 'destructive',
  Refunded: 'info',
  Expired: 'neutral',
}

function statusBadge(status: BookingStatus) {
  return (
    <span className={cn('text-xs font-bold px-2 py-1 rounded border', statusBadgeClass(STATUS_TONE[status] ?? 'neutral'))}>
      {status}
    </span>
  )
}

function TicketQrModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', bookingId],
    queryFn: () => ticketsApi.getByBooking(bookingId),
  })
  const tickets: TicketDto[] = data?.data?.data ?? []

  return (
    <Modal isOpen onClose={onClose} title="Your E-Tickets">
      <div className="space-y-6">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
          </div>
        )}
        {!isLoading && tickets.length === 0 && (
          <p className="text-center text-(--muted-foreground) py-4">
            Tickets not generated yet. Please wait for booking confirmation.
          </p>
        )}
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border border-(--border) rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{ticket.movieTitle}</p>
                <p className="text-sm text-(--muted-foreground)">
                  {new Date(ticket.showtimeStart).toLocaleString([], {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p className="text-sm text-(--muted-foreground)">{ticket.theaterName} • {ticket.screenName}</p>
              </div>
              {ticket.isUsed && (
                <span className="text-xs bg-(--muted) text-(--muted-foreground) px-2 py-1 rounded font-medium">USED</span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-xl p-3 shadow-sm border border-(--border)">
                {ticket.qrCodeData ? (
                  <img
                    src={`data:image/png;base64,${ticket.qrCodeData}`}
                    alt="QR Code"
                    className="w-28 h-28"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-(--muted-foreground)" strokeWidth={1} />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-(--muted-foreground) uppercase">Ticket #</p>
                  <p className="font-mono font-bold">{ticket.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-(--muted-foreground) uppercase">Seat</p>
                  <p className="font-bold">{ticket.seatCategoryName} – {ticket.rowLabel}{ticket.seatNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-(--muted-foreground) uppercase">Price</p>
                  <p className="font-bold text-(--primary)">Rs. {ticket.price}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

function BookingCard({ booking, isHighlighted }: { booking: Booking; isHighlighted: boolean }) {
  const [showTickets, setShowTickets] = React.useState(false)
  const [showCancelModal, setShowCancelModal] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id, cancelReason),
    onSuccess: () => {
      toast({ title: 'Booking cancelled', description: 'Your booking has been cancelled.' })
      setShowCancelModal(false)
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    },
    onError: () => {
      toast({ title: 'Cancel failed', description: 'Could not cancel booking. Please try again.', variant: 'destructive' })
    },
  })

  const showtimeFormatted = new Date(booking.showtimeStart).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const canCancel = booking.status === 'Confirmed' || booking.status === 'Pending'

  return (
    <>
      <div className={cn(
        'border rounded-2xl overflow-hidden bg-(--background) transition-all duration-300',
        isHighlighted ? 'border-(--primary) shadow-lg shadow-(--primary)/10' : 'border-(--border)',
        booking.status === 'Cancelled' || booking.status === 'Expired' ? 'opacity-70' : ''
      )}>
        <div className="p-5 flex flex-col md:flex-row gap-5">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg leading-tight">{booking.movieTitle}</h3>
                <p className="text-sm text-(--muted-foreground) mt-0.5">{showtimeFormatted}</p>
                <p className="text-sm text-(--muted-foreground)">{booking.theaterName} • {booking.screenName}</p>
              </div>
              {statusBadge(booking.status)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-(--muted)/50 p-3 rounded-xl border border-(--border)">
              <div>
                <p className="text-xs text-(--muted-foreground) uppercase mb-1">Booking Ref</p>
                <p className="font-mono font-bold text-xs">{booking.bookingReference}</p>
              </div>
              <div>
                <p className="text-xs text-(--muted-foreground) uppercase mb-1">Seats</p>
                <p className="font-semibold">{booking.items?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-(--muted-foreground) uppercase mb-1">Total</p>
                <p className="font-bold text-(--primary)">Rs. {booking.totalAmount}</p>
              </div>
              <div>
                <p className="text-xs text-(--muted-foreground) uppercase mb-1">Payment</p>
                <p className="font-semibold">{booking.payment?.status ?? 'N/A'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {booking.items?.map((item) => (
                <span key={item.id} className="text-xs bg-(--primary)/10 text-(--primary) px-2 py-1 rounded font-medium">
                  {item.seatCategoryName} {item.rowLabel}{item.seatNumber}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 md:w-36 justify-end md:justify-start">
            {booking.status === 'Confirmed' && (
              <Button
                size="sm"
                className="flex-1 md:w-full"
                onClick={() => setShowTickets(true)}
              >
                <QrCode className="h-4 w-4 mr-2" /> View Tickets
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 md:w-full text-(--destructive) border-(--destructive)/30 hover:bg-(--destructive)/10"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle className="h-4 w-4 mr-2" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {showTickets && <TicketQrModal bookingId={booking.id} onClose={() => setShowTickets(false)} />}

      {showCancelModal && (
        <Modal isOpen onClose={() => setShowCancelModal(false)} title="Cancel Booking">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700">Are you sure you want to cancel?</p>
                <p className="text-(--muted-foreground) mt-1">
                  Cancelling "{booking.movieTitle}" ({booking.bookingReference}).
                  {booking.payment?.status === 'Succeeded' && ' A refund will be processed within 5-7 business days.'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling?"
                rows={3}
                className="mt-1 w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Yes, Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function TicketsPageContent() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings', statusFilter, page],
    queryFn: () => bookingsApi.getMyBookings({
      page,
      pageSize: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  })

  const bookings: Booking[] = data?.data?.data?.items ?? []
  const totalCount = data?.data?.data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / 10)

  const active = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Pending')
  const past = bookings.filter((b) => b.status !== 'Confirmed' && b.status !== 'Pending')

  const filters: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Cancelled', value: 'Cancelled' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-(--font-display) text-2xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-(--muted-foreground) text-sm mt-1">View and manage your movie bookings.</p>
        </div>
        <Link href="/">
          <Button size="sm">Book a Movie</Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1) }}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
              statusFilter === f.value
                ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                : 'border-(--border) text-(--muted-foreground) hover:border-(--primary) hover:text-(--foreground)'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-(--muted-foreground)" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 border border-(--border) border-dashed rounded-2xl">
          <Ticket className="w-12 h-12 text-(--muted-foreground) mx-auto mb-4 opacity-50" />
          <h3 className="font-medium text-lg">No bookings found</h3>
          <p className="text-(--muted-foreground) text-sm mb-6">You haven't made any bookings yet.</p>
          <Link href="/"><Button>Book a ticket now</Button></Link>
        </div>
      ) : (
        <>
          {statusFilter === 'all' ? (
            <>
              {active.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Active Bookings</h2>
                  <div className="space-y-4">
                    {active.map((b) => (
                      <BookingCard key={b.id} booking={b} isHighlighted={b.id === highlightId} />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Past Bookings</h2>
                  <div className="space-y-4">
                    {past.map((b) => (
                      <BookingCard key={b.id} booking={b} isHighlighted={false} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} isHighlighted={b.id === highlightId} />
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
        </>
      )}
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" /></div>}>
      <TicketsPageContent />
    </Suspense>
  )
}
