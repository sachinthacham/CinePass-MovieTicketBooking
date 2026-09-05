'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadStripe, type Appearance } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ArrowLeft, Clock, MapPin, CreditCard, Loader2, CheckCircle2, Lock, Film } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/lib/stores/authStore'
import { bookingsApi } from '@/lib/api/bookings'
import { useToast } from '@/components/ui/Toast'
import { getApiErrorMessage } from '@/lib/utils/apiError'
import type { ShowtimeSeat, CreateBookingResult } from '@/lib/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

// Stripe Elements renders in a sandboxed iframe and can't read the page's CSS custom
// properties, so the site's dark cinema-marquee palette (see globals.css) is
// hardcoded here to match. The app is always in dark mode (`.dark` is forced on
// <html> in layout.tsx), so there's only one palette to match, not a light/dark pair.
const stripeAppearance: Appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#e3a73f',
    colorBackground: '#1c140c',
    colorText: '#f5ead6',
    colorTextSecondary: '#9c8a6f',
    colorDanger: '#c0463a',
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#1c140c',
      border: '1px solid #34281a',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #e8b052',
      boxShadow: '0 0 0 1px #e8b052',
    },
    '.Label': {
      color: '#9c8a6f',
    },
    '.Tab': {
      backgroundColor: '#1c140c',
      border: '1px solid #34281a',
    },
    '.Tab:hover': {
      backgroundColor: '#241a10',
    },
    '.Tab--selected': {
      backgroundColor: '#241a10',
      border: '1px solid #e8b052',
    },
  },
}

interface BookingContext {
  movieId: string
  showtimeId: string
  sessionId: string
  seatIds: string[]
  seatDetails: ShowtimeSeat[]
  totalAmount: number
  movieTitle?: string
  theaterName?: string
  screenName?: string
  showtimeStart?: string
  showFormatName?: string
}

/** Renders inside <Elements>, so it can use the Stripe hooks to actually charge the card. */
function StripePaymentForm({ bookingResult }: { bookingResult: CreateBookingResult }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsSubmitting(true)

    const statusUrl = `/checkout/status?bookingId=${bookingResult.bookingId}&reference=${bookingResult.bookingReference}&amount=${bookingResult.totalAmount}`

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${statusUrl}`,
      },
      // Most card payments resolve inline without a redirect; only payment methods
      // that require one (rare here) will leave the page.
      redirect: 'if_required',
    })

    if (error) {
      toast({
        title: 'Payment failed',
        description: error.message ?? 'Please check your card details and try again.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      sessionStorage.removeItem('booking-context')
      sessionStorage.removeItem('seat-session-id')
      router.push(statusUrl)
      return
    }

    // Requires further action Stripe couldn't resolve inline — treat as a failure
    // rather than silently leaving the user on a stuck "Processing..." button.
    toast({
      title: 'Payment incomplete',
      description: 'We could not confirm your payment. Please try again.',
      variant: 'destructive',
    })
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      <div className="flex items-center text-xs text-(--muted-foreground) mt-2">
        <Lock className="h-3 w-3 mr-1" /> Payments are processed securely by Stripe. We never see your card details.
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full text-base font-bold shadow-xl h-14 mt-2"
        disabled={!stripe || isSubmitting}
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
        ) : (
          <><CreditCard className="h-5 w-5 mr-2" />Pay Rs. {bookingResult.totalAmount}</>
        )}
      </Button>
    </form>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [context, setContext] = React.useState<BookingContext | null>(null)
  const [step, setStep] = React.useState<'review' | 'payment'>('review')
  const [bookingResult, setBookingResult] = React.useState<CreateBookingResult | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = React.useState(false)

  React.useEffect(() => {
    const stored = sessionStorage.getItem('booking-context')
    if (!stored) {
      router.push('/')
      return
    }
    try {
      setContext(JSON.parse(stored))
    } catch {
      router.push('/')
    }
  }, [router])

  const handleProceedToPay = async () => {
    if (!context) return

    setIsCreatingBooking(true)
    try {
      // Creates the Pending booking + a Stripe PaymentIntent server-side; the total
      // charged is computed from current DB prices, not trusted from this context.
      const response = await bookingsApi.create({
        showtimeId: context.showtimeId,
        seatIds: context.seatIds,
        sessionId: context.sessionId,
      })
      setBookingResult(response.data.data)
      setStep('payment')
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not start checkout. Please try again.')
      toast({ title: 'Booking failed', description: message, variant: 'destructive' })
    } finally {
      setIsCreatingBooking(false)
    }
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
      </div>
    )
  }

  const totalWithFee = context.totalAmount + Math.round(context.totalAmount * 0.05)

  const showtimeFormatted = context.showtimeStart
    ? new Date(context.showtimeStart).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'N/A'

  return (
    <div className="container mx-auto px-4 py-8 md:px-8 max-w-6xl min-h-[calc(100vh-14rem)]">
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" size="icon" className="rounded-full hidden md:flex" asChild>
          <Link href={`/movie/${context.movieId}/seats?showtimeId=${context.showtimeId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-(--font-display) text-3xl font-extrabold tracking-tight">Checkout</h1>
          <p className="text-sm text-(--muted-foreground) mt-1">Review your booking and complete payment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — Booking Details & Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Summary */}
          <section className="bg-(--background) border border-(--border) rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Film className="h-5 w-5 mr-2 text-(--primary)" /> Booking Details
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold">{context.movieTitle}</h3>
                {context.showFormatName && (
                  <span className="inline-block mt-1 text-xs font-medium bg-(--muted) px-2 py-1 rounded">
                    {context.showFormatName}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-(--border)">
                <div className="space-y-1">
                  <p className="text-xs text-(--muted-foreground) uppercase tracking-wide">Date & Time</p>
                  <p className="font-semibold text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-2 shrink-0" /> {showtimeFormatted}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-(--muted-foreground) uppercase tracking-wide">Theatre & Screen</p>
                  <p className="font-semibold text-sm flex items-start">
                    <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                    <span>{context.theaterName}<br /><span className="text-(--muted-foreground) font-normal">{context.screenName}</span></span>
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-xs text-(--muted-foreground) uppercase tracking-wide">Selected Seats</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {context.seatDetails.map((seat) => (
                      <span key={seat.id} className="px-2 py-1 bg-(--primary)/10 text-(--primary) rounded-md text-xs font-bold">
                        {seat.seatCategoryName} - {seat.rowLabel}{seat.seatNumber}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Form */}
          {step === 'payment' && bookingResult ? (
            <section className="bg-(--background) border border-(--border) rounded-2xl p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-bold flex items-center">
                <Lock className="h-5 w-5 mr-2 text-(--primary)" /> Secure Payment
              </h2>
              <p className="text-sm text-(--muted-foreground)">
                Your payment is encrypted and secure. We use industry-standard SSL encryption.
              </p>
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: bookingResult.stripeClientSecret, appearance: stripeAppearance }}
              >
                <StripePaymentForm bookingResult={bookingResult} />
              </Elements>
            </section>
          ) : (
            <section className="bg-(--background) border border-(--border) rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold">Contact Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" value={user?.email ?? ''} readOnly className="mt-1 bg-(--muted)/50" />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} readOnly className="mt-1 bg-(--muted)/50" />
                </div>
              </div>
              <p className="text-xs text-(--muted-foreground)">Your tickets will be sent to this email address.</p>
            </section>
          )}
        </div>

        {/* Right — Order Total */}
        <div className="lg:col-span-1">
          <div className="bg-(--background) border border-(--border) rounded-2xl p-6 sticky top-24 space-y-4">
            <h3 className="font-bold text-lg">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              {context.seatDetails.map((seat) => (
                <div key={seat.id} className="flex justify-between text-(--muted-foreground)">
                  <span>{seat.seatCategoryName} ({seat.rowLabel}{seat.seatNumber})</span>
                  <span className="font-medium text-(--foreground)">Rs. {seat.price}</span>
                </div>
              ))}
              <div className="flex justify-between text-(--muted-foreground)">
                <span>Convenience Fee (5%)</span>
                <span className="font-medium text-(--foreground)">Rs. {Math.round(context.totalAmount * 0.05)}</span>
              </div>
            </div>
            <div className="border-t border-dashed border-(--border) my-2" />
            <div className="flex justify-between items-center bg-(--muted)/50 p-4 rounded-xl border border-(--border)">
              <span className="font-bold text-lg">Total Amount</span>
              <span className="font-extrabold text-2xl text-(--primary)">Rs. {totalWithFee}</span>
            </div>

            {step === 'review' && (
              <Button
                size="lg"
                className="w-full text-base font-bold shadow-xl h-14 mt-4"
                onClick={handleProceedToPay}
                disabled={isCreatingBooking}
              >
                {isCreatingBooking ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Preparing checkout...</>
                ) : (
                  <><CreditCard className="h-5 w-5 mr-2" /> Proceed to Pay</>
                )}
              </Button>
            )}

            <div className="flex items-center justify-center space-x-2 mt-4">
              <CheckCircle2 className="h-4 w-4 text-(--success)" />
              <span className="text-xs text-(--muted-foreground)">Instant booking confirmation</span>
            </div>
            <p className="text-[10px] text-center text-(--muted-foreground) px-2 leading-relaxed">
              By proceeding, you agree to MovieTick&apos;s Terms & Conditions and Cancellation Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
