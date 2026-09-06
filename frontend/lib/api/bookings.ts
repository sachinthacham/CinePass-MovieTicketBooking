import api from './axios'
import type { ApiResponse, Booking, PagedBookings, CreateBookingRequest, CreateBookingResult } from '@/lib/types'

export const bookingsApi = {
  create: (data: CreateBookingRequest) =>
    api.post<ApiResponse<CreateBookingResult>>('/bookings', data),

  getById: (id: string) =>
    api.get<ApiResponse<Booking>>(`/bookings/${id}`),

  getMyBookings: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<ApiResponse<PagedBookings>>('/bookings/my', { params }),

  cancel: (id: string, reason?: string) =>
    api.post<ApiResponse<boolean>>(`/bookings/${id}/cancel`, { reason }),

  // Admin
  adminGetAll: (params?: { page?: number; pageSize?: number; status?: string; userId?: string; fromDate?: string; toDate?: string; search?: string }) =>
    api.get<ApiResponse<PagedBookings>>('/bookings/admin', { params }),

  adminCancel: (id: string, reason?: string) =>
    api.post<ApiResponse<boolean>>(`/bookings/admin/${id}/cancel`, { reason }),
}
