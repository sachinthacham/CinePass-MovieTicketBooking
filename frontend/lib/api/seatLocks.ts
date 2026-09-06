import api from './axios'
import type { ApiResponse, SeatLockRequest } from '@/lib/types'

export const seatLocksApi = {
  lock: (data: SeatLockRequest) =>
    api.post<ApiResponse<boolean>>('/seat-locks', data).then((r) => r.data),

  unlock: (data: SeatLockRequest) =>
    api.post<ApiResponse<boolean>>('/seat-locks/unlock', data).then((r) => r.data),
}
