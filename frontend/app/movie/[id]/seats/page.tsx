'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Monitor, Loader2, Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { showtimesApi } from '@/lib/api/showtimes'
import { moviesApi } from '@/lib/api/movies'
import { seatLocksApi } from '@/lib/api/seatLocks'
import { useAuthStore } from '@/lib/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { useSeatAvailability, type SeatStatusChangedPayload } from '@/lib/hooks/useSeatAvailability'
import type { ShowtimeSeat, ApiResponse } from '@/lib/types'

interface GroupedCategory {
  name: string
  price: number
  colorCode?: string
  rows: Map<string, ShowtimeSeat[]>
}

function SeatSelectionContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  const showtimeId = searchParams.get('showtimeId') ?? ''

  // Stable session ID for this seat-selection session
  const sessionId = React.useMemo(() => {
    const stored = sessionStorage.getItem('seat-session-id')
    if (stored) return stored
    const id = crypto.randomUUID()
    sessionStorage.setItem('seat-session-id', id)
    return id
  }, [])

  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([])
  const [lockedSeats, setLockedSeats] = React.useState<string[]>([])
  const [isLocking, setIsLocking] = React.useState(false)

  const { data: movieData } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesApi.getById(id),
  })

  const { data: showtimeData } = useQuery({
    queryKey: ['showtime', showtimeId],
    queryFn: () => showtimesApi.getById(showtimeId),
    enabled: Boolean(showtimeId),
  })

  const seatsQueryKey = ['showtime-seats', showtimeId]
  const { data: seatsData, isLoading: loadingSeats, refetch: refetchSeats } = useQuery({
    queryKey: seatsQueryKey,
    queryFn: () => showtimesApi.getSeats(showtimeId),
    enabled: Boolean(showtimeId),
    // Real-time updates arrive via SignalR (see useSeatAvailability below); this
    // interval is just a reconciliation fallback in case that connection drops.
    refetchInterval: 15000,
  })

  // Live seat-status updates: another user locking/booking/releasing a seat shows
  // up immediately instead of waiting for the next 15s poll.
  const handleSeatStatusChanged = React.useCallback(
    (payload: SeatStatusChangedPayload) => {
      queryClient.setQueryData<ApiResponse<ShowtimeSeat[]>>(seatsQueryKey, (current) => {
        if (!current?.data) return current
        return {
          ...current,
          data: current.data.map((seat) =>
            seat.seatId === payload.seatId ? { ...seat, status: payload.status } : seat
          ),
        }
      })
    },
    // seatsQueryKey is derived fresh each render from showtimeId; depending on
    // showtimeId directly keeps this callback stable without an array-identity issue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, showtimeId]
  )

  useSeatAvailability(showtimeId || undefined, handleSeatStatusChanged)

  const lockMutation = useMutation({
    mutationFn: (seatIds: string[]) =>
      seatLocksApi.lock({ showtimeId, seatIds, sessionId }),
    onSuccess: (_, seatIds) => {
      setLockedSeats((prev) => [...new Set([...prev, ...seatIds])])
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast({ title: 'Login required', description: 'Please log in to select seats.', variant: 'destructive' })
        router.push(`/auth/login?redirect=/movie/${id}/seats?showtimeId=${showtimeId}`)
      } else {
        toast({ title: 'Seats unavailable', description: 'One or more seats were taken. Please re-select.', variant: 'destructive' })
        refetchSeats()
      }
      setSelectedSeats([])
      setLockedSeats([])
    },
  })

  const unlockMutation = useMutation({
    mutationFn: (seatIds: string[]) =>
      seatLocksApi.unlock({ showtimeId, seatIds, sessionId }),
    onSuccess: (_, seatIds) => {
      setLockedSeats((prev) => prev.filter((id) => !seatIds.includes(id)))
    },
  })

  // Unlock all locked seats on unmount
  React.useEffect(() => {
    return () => {
      if (lockedSeats.length > 0) {
        seatLocksApi.unlock({ showtimeId, seatIds: lockedSeats, sessionId }).catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const movie = movieData?.data
  const showtime = showtimeData?.data
  const seats: ShowtimeSeat[] = React.useMemo(() => seatsData?.data ?? [], [seatsData])

  const groupedCategories = React.useMemo(() => {
    const categories = new Map<string, GroupedCategory>()
    seats.forEach((seat) => {
      if (!categories.has(seat.seatCategoryId)) {
        categories.set(seat.seatCategoryId, {
          name: seat.seatCategoryName,
          price: seat.price,
          colorCode: seat.colorCode,
          rows: new Map(),
        })
      }
      const cat = categories.get(seat.seatCategoryId)!
      if (!cat.rows.has(seat.rowLabel)) {
        cat.rows.set(seat.rowLabel, [])
      }
      cat.rows.get(seat.rowLabel)!.push(seat)
    })
    return Array.from(categories.values())
  }, [seats])

  const selectedSeatDetails = seats.filter((s) => selectedSeats.includes(s.id))
  const totalAmount = selectedSeatDetails.reduce((sum, s) => sum + s.price, 0)

  const toggleSeat = async (seat: ShowtimeSeat) => {
    if (seat.status !== 'Available' && !lockedSeats.includes(seat.id)) return

    if (selectedSeats.includes(seat.id)) {
      // Deselect → unlock
      setSelectedSeats((prev) => prev.filter((s) => s !== seat.id))
      if (showtimeId) {
        unlockMutation.mutate([seat.id])
      }
    } else {
      if (selectedSeats.length >= 10) {
        toast({ title: 'Maximum seats', description: 'You can select up to 10 seats.', variant: 'destructive' })
        return
      }
      // Select → lock
      setSelectedSeats((prev) => [...prev, seat.id])
      if (showtimeId) {
        setIsLocking(true)
        try {
          await lockMutation.mutateAsync([seat.id])
        } catch {
          setSelectedSeats((prev) => prev.filter((s) => s !== seat.id))
        } finally {
          setIsLocking(false)
        }
      }
    }
  }

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      toast({ title: 'Login required', description: 'Please log in to proceed with booking.', variant: 'destructive' })
      router.push(`/auth/login?redirect=/movie/${id}/seats?showtimeId=${showtimeId}`)
      return
    }

    // Save booking context to sessionStorage
    sessionStorage.setItem('booking-context', JSON.stringify({
      movieId: id,
      showtimeId,
      sessionId,
      seatIds: selectedSeats,
      seatDetails: selectedSeatDetails,
      totalAmount,
      movieTitle: movie?.title,
      theaterName: showtime?.theaterName,
      screenName: showtime?.screenName,
      showtimeStart: showtime?.startTime,
      showFormatName: showtime?.showFormatName,
    }))

    router.push('/checkout')
  }

  const showtimeLabel = showtime
    ? `${showtime.theaterName} • ${new Date(showtime.startTime).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })}`
    : 'Select a showtime'

  const activeCount = selectedSeats.length

  // No showtimeId in the URL (bad link, back-button edge case, etc.) — show a
  // real error state instead of a fabricated seat map.
  if (!showtimeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="w-16 h-16 rounded-full bg-(--muted) flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-(--muted-foreground)" />
        </div>
        <h1 className="font-(--font-display) text-xl font-bold">No showtime selected</h1>
        <p className="text-(--muted-foreground) mt-2 max-w-sm">
          We couldn&apos;t find a showtime for this seat selection. Please pick a showtime again.
        </p>
        <Link href={`/movie/${id}/showtimes`} className="mt-6">
          <Button>Choose a showtime</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-(--background)">
      <header className="sticky top-0 z-40 bg-(--background) border-b border-(--border)">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/movie/${id}/showtimes`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold">{movie?.title ?? 'Loading...'}</h1>
              <p className="text-xs text-(--muted-foreground)">{showtimeLabel}</p>
            </div>
          </div>
          <div className="hidden sm:flex text-sm space-x-4 items-center">
            <div className="flex items-center"><div className="w-4 h-4 border border-(--border) rounded-t-sm mr-2" />Available</div>
            <div className="flex items-center"><div className="w-4 h-4 bg-(--primary) rounded-t-sm mr-2" />Selected</div>
            <div className="flex items-center"><div className="w-4 h-4 bg-amber-500/30 rounded-t-sm mr-2" />Reserved</div>
            <div className="flex items-center"><div className="w-4 h-4 bg-(--muted) rounded-t-sm mr-2" />Sold</div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-4 md:p-8 overflow-auto flex flex-col items-center">
          <div className="w-full max-w-4xl mx-auto mb-16 relative flex flex-col items-center">
            <div className="w-3/4 h-24 border-t-4 border-(--primary) rounded-[50%] opacity-20" />
            <div className="absolute top-4 text-xs font-semibold tracking-widest text-(--muted-foreground) flex items-center">
              <Monitor className="h-4 w-4 mr-2" /> ALL EYES THIS WAY
            </div>
          </div>

          {loadingSeats ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-(--muted-foreground)" />
            </div>
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle className="h-10 w-10 text-(--muted-foreground) mb-4" />
              <p className="font-medium">No seats configured for this showtime.</p>
              <p className="text-sm text-(--muted-foreground) mt-1">Please choose a different showtime.</p>
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto space-y-8 pb-32">
              {[...groupedCategories].reverse().map((category) => (
                <div key={category.name} className="space-y-4 pt-4 border-t border-(--border)/50 first:border-0 first:pt-0">
                  <div className="text-xs font-semibold text-(--muted-foreground) tracking-wider text-center">
                    Rs. {category.price} {category.name}
                  </div>
                  <div className="space-y-3">
                    {Array.from(category.rows.entries()).map(([rowLabel, rowSeats]) => (
                      <div key={rowLabel} className="flex items-center gap-2">
                        <div className="w-6 text-sm font-semibold text-(--muted-foreground) shrink-0 text-center">{rowLabel}</div>
                        <div className="flex gap-2 flex-1 justify-center flex-wrap">
                          {rowSeats
                            .slice()
                            .sort((a, b) => {
                              const na = Number(a.seatNumber)
                              const nb = Number(b.seatNumber)
                              if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
                              return String(a.seatNumber).localeCompare(String(b.seatNumber))
                            })
                            .map((seat) => {
                            const isSelected = selectedSeats.includes(seat.id)
                            const isBooked = seat.status === 'Booked' || seat.status === 'Blocked'
                            const isReservedByOther = seat.status === 'Reserved' && !lockedSeats.includes(seat.id)
                            const seatLabel = `${seat.rowLabel}${seat.seatNumber}`
                            const statusLabel = isBooked ? 'sold' : isReservedByOther ? 'reserved' : isSelected ? 'selected' : 'available'
                            return (
                              <button
                                key={seat.id}
                                disabled={isBooked || isReservedByOther || isLocking}
                                onClick={() => toggleSeat(seat)}
                                title={`${seatLabel} - ${seat.status}`}
                                aria-label={`Seat ${seatLabel}, ${statusLabel}`}
                                aria-pressed={isSelected}
                                className={cn(
                                  'h-8 w-8 text-xs font-semibold rounded-t-md transition-all flex items-center justify-center border',
                                  isBooked
                                    ? 'bg-(--muted) border-transparent cursor-not-allowed opacity-50'
                                    : isReservedByOther
                                    ? 'bg-amber-500/30 border-amber-500/50 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-(--primary) border-(--primary) text-(--primary-foreground) scale-110 shadow-lg'
                                    : 'bg-(--background) border-(--border) hover:border-(--primary) hover:bg-(--primary)/10'
                                )}
                              >
                                {isSelected ? seat.seatNumber : isReservedByOther ? <Lock className="h-3 w-3" /> : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={cn(
          'w-full lg:w-96 bg-(--background) border-t lg:border-t-0 lg:border-l border-(--border) shadow-2xl lg:shadow-none p-6 transition-all duration-300 z-50 fixed lg:relative bottom-0',
          activeCount > 0 ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        )}>
          {activeCount > 0 ? (
            <div className="h-full flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4">Booking Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-(--muted-foreground)">
                    <span>Tickets ({activeCount})</span>
                    <span className="font-medium text-(--foreground) text-right max-w-[200px] truncate">
                      {selectedSeatDetails.map((s) => `${s.rowLabel}${s.seatNumber}`).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-(--muted)/50 p-3 rounded-md border border-(--border)">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-bold text-lg">Rs. {totalAmount}</span>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full text-base font-bold shadow-xl"
                onClick={handleProceedToCheckout}
                disabled={isLocking}
              >
                {isLocking ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Locking...</> : 'Proceed to Checkout'}
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-(--muted-foreground) min-h-[200px] text-center">
              <div className="w-16 h-16 rounded-full bg-(--muted) flex items-center justify-center mb-4">
                <Monitor className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium">Please select your seats above</p>
              <p className="text-sm mt-1">Select up to 10 seats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SeatSelectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-(--muted-foreground)">Loading seat map...</div>
      </div>
    }>
      <SeatSelectionContent />
    </Suspense>
  )
}
