'use client'

import * as React from 'react'
import * as signalR from '@microsoft/signalr'

export interface SeatStatusChangedPayload {
  showtimeId: string
  seatId: string
  status: 'Available' | 'Booked' | 'Blocked' | 'Reserved'
}

function getHubUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5050/api/v1'
  const origin = apiUrl.replace(/\/api\/v1\/?$/, '')
  return `${origin}/hubs/seat-availability`
}

/**
 * Subscribes to real-time seat status changes for a showtime via the backend's
 * SignalR hub, so another user locking/booking a seat shows up immediately instead
 * of waiting for the next poll. This is a progressive enhancement, not the source
 * of truth — the caller should keep its own polling as a fallback in case the
 * connection never establishes (e.g. a proxy blocking WebSockets).
 */
export function useSeatAvailability(
  showtimeId: string | undefined,
  onSeatStatusChanged: (payload: SeatStatusChangedPayload) => void
) {
  const callbackRef = React.useRef(onSeatStatusChanged)
  React.useEffect(() => {
    callbackRef.current = onSeatStatusChanged
  })

  React.useEffect(() => {
    if (!showtimeId) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getHubUrl())
      .withAutomaticReconnect()
      .build()

    connection.on('SeatStatusChanged', (payload: SeatStatusChangedPayload) => {
      callbackRef.current(payload)
    })

    connection.onreconnected(() => {
      connection.invoke('JoinShowtime', showtimeId).catch(() => {})
    })

    connection
      .start()
      .then(() => connection.invoke('JoinShowtime', showtimeId))
      .catch(() => {
        // No real-time updates this session — the caller's polling interval is
        // the fallback, so this is a silent degradation, not a failure.
      })

    return () => {
      connection.invoke('LeaveShowtime', showtimeId).catch(() => {})
      connection.stop()
    }
  }, [showtimeId])
}
