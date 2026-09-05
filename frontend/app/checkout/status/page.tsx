'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Download, Loader2, Ticket, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { bookingsApi } from '@/lib/api/bookings'

function CheckoutStatusContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const reference = searchParams.get('reference')
  const amount = searchParams.get('amount')
  const failed = searchParams.get('status') === 'failure'

  const { data: bookingData, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId!),
    enabled: Boolean(bookingId),
    retry: 3,
    retryDelay: 2000,
  })

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] px-4 text-center">
        <div className="w-24 h-24 bg-(--destructive)/10 text-(--destructive) rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12" />
        </div>
        <h1 className="font-(--font-display) text-3xl font-bold tracking-tight mb-2">Payment Failed</h1>
        <p className="text-(--muted-foreground) max-w-md mx-auto mb-8">
          We couldn't process your payment. Please try again with a different payment method or contact your bank.
        </p>
        <div className="flex items-center space-x-4">
          <Link href="/checkout"><Button size="lg">Try Again</Button></Link>
          <Link href="/"><Button variant="outline" size="lg">Back to Home</Button></Link>
        </div>
      </div>
    )
  }

  const booking = bookingData?.data?.data

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-(--primary)" />
        <p className="text-(--muted-foreground)">Loading your booking confirmation...</p>
      </div>
    )
  }

  const displayReference = reference || booking?.bookingReference || 'N/A'
  const displayAmount = amount || booking?.totalAmount?.toString() || '0'
  const movieTitle = booking?.movieTitle || 'Your Movie'
  const theaterName = booking?.theaterName || ''
  const screenName = booking?.screenName || ''
  const showtimeStart = booking?.showtimeStart
    ? new Date(booking.showtimeStart).toLocaleString([], {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4">
      <div className="w-full max-w-lg bg-(--background) border border-(--border) rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-(--success)/20 to-transparent" />

        <div className="relative z-10 text-center mb-8 pt-4">
          <div className="w-20 h-20 bg-(--success) text-(--success-foreground) shadow-lg shadow-(--success)/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="font-(--font-display) text-3xl font-extrabold tracking-tight">Booking Confirmed!</h1>
          <p className="text-sm font-medium text-(--muted-foreground) mt-2">Ref: #{displayReference}</p>
        </div>

        <div className="relative z-10 bg-(--muted)/30 rounded-2xl p-6 border border-(--border) border-dashed mb-8 space-y-4">
          <h2 className="font-bold text-xl text-center">{movieTitle}</h2>

          {showtimeStart && (
            <div className="flex items-start space-x-3 text-sm">
              <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-(--muted-foreground)" />
              <span className="font-semibold">{showtimeStart}</span>
            </div>
          )}

          {(theaterName || screenName) && (
            <div className="flex items-start space-x-3 text-sm">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-(--muted-foreground)" />
              <span className="font-semibold">{theaterName}{screenName && <><br /><span className="font-normal text-(--muted-foreground)">{screenName}</span></>}</span>
            </div>
          )}

          {booking?.items && booking.items.length > 0 && (
            <div>
              <p className="text-xs text-(--muted-foreground) uppercase tracking-wider mb-2">
                Seats ({booking.items.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {booking.items.map((item) => (
                  <span key={item.id} className="px-2 py-1 bg-(--primary) text-(--primary-foreground) rounded-md text-xs font-bold shadow-sm">
                    {item.seatCategoryName}-{item.rowLabel}{item.seatNumber}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-(--border) pt-3 flex justify-between items-center">
            <span className="text-sm text-(--muted-foreground)">Total Paid</span>
            <span className="font-bold text-lg text-(--primary)">Rs. {parseFloat(displayAmount).toFixed(0)}</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col space-y-3">
          <Link href={bookingId ? `/dashboard/tickets?highlight=${bookingId}` : '/dashboard/tickets'}>
            <Button size="lg" className="w-full text-base h-12 shadow-md">
              <Ticket className="w-5 h-5 mr-2" /> View My Tickets
            </Button>
          </Link>
          <div className="flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="ghost" className="w-full h-12 hover:bg-(--muted)">
                Go to Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute top-[42%] -left-4 w-8 h-8 rounded-full bg-(--background) hidden md:block" />
        <div className="absolute top-[42%] -right-4 w-8 h-8 rounded-full bg-(--background) hidden md:block" />
        <div className="absolute top-[42%] left-4 right-4 h-px border-b-2 border-dashed border-(--muted) hidden md:block" />
      </div>
    </div>
  )
}

export default function CheckoutStatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
      </div>
    }>
      <CheckoutStatusContent />
    </Suspense>
  )
}
