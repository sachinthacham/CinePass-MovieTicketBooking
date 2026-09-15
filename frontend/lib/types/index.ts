// ─── Common ──────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errors?: string[]
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  firstName: string
  lastName: string
  email: string
  password: string
}

/** Backend `AuthResponseDto` — tokens only; user info comes from JWT + `/auth/profile`. */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/** @deprecated Use AuthTokens */
export type AuthResponse = AuthTokens

export interface RefreshTokenDto {
  refreshToken: string
}

export interface RequestPasswordResetDto {
  email: string
}

export interface ResetPasswordDto {
  email: string
  token: string
  newPassword: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  bio?: string
  dateOfBirth?: string
  gender?: string
  profileImageUrl?: string
  roles: string[]
  createdAt: string
}

export interface UpdateProfileDto {
  firstName: string
  lastName: string
  bio?: string
  dateOfBirth?: string
  gender?: string
}

// ─── Movies ───────────────────────────────────────────────────────────────────

export interface Genre {
  id: string
  name: string
  slug?: string
}

export interface Language {
  id: string
  name: string
  code: string
}

export interface MoviePoster {
  id: string
  /** Backend `MoviePosterDto.ImageUrl` */
  imageUrl: string
  /** Legacy / alternate name — prefer `imageUrl` */
  url?: string
  type: 'Portrait' | 'Landscape' | 'Thumbnail' | 'Banner'
  isPrimary: boolean
}

export interface MovieTrailer {
  id: string
  title: string
  url: string
  thumbnailUrl?: string
  isPrimary: boolean
}

export interface MovieRating {
  id: string
  userId: string
  userName: string
  rating: number
  createdAt: string
}

export interface MovieReview {
  id: string
  userId: string
  userName: string
  userProfileImageUrl?: string
  content: string
  isApproved: boolean
  createdAt: string
}

export interface Movie {
  id: string
  title: string
  description?: string
  durationMinutes: number
  releaseDate: string
  director?: string
  cast?: string
  certificateRating?: string
  averageRating: number | null
  totalRatings: number
  isFeatured: boolean
  isComingSoon: boolean
  isActive: boolean
  genres: Genre[]
  languages: Language[]
  posters: MoviePoster[]
  trailers: MovieTrailer[]
  reviews?: MovieReview[]
  createdAt: string
  updatedAt: string
}

export interface CreateMovieDto {
  title: string
  description?: string
  durationMinutes: number
  releaseDate: string
  director?: string
  cast?: string
  certificateRating?: string
  isFeatured?: boolean
  isComingSoon?: boolean
}

export type UpdateMovieDto = Partial<CreateMovieDto>

export interface MoviesFilter {
  search?: string
  genreId?: string
  languageId?: string
  isFeatured?: boolean
  isComingSoon?: boolean
  isActive?: boolean
  sortBy?: string
  city?: string
  formatId?: string
  pageNumber?: number
  pageSize?: number
}

// ─── Theaters ─────────────────────────────────────────────────────────────────

export interface TheaterFacility {
  id: string
  name: string
  description?: string
  iconName?: string
}

export interface TheaterImage {
  id: string
  url: string
  caption?: string
  displayOrder: number
}

export interface Theater {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  zipCode?: string
  latitude?: number
  longitude?: number
  phoneNumber?: string
  email?: string
  totalScreens: number
  averageRating: number
  totalRatings: number
  isActive: boolean
  facilities: TheaterFacility[]
  images: TheaterImage[]
  createdAt: string
}

export interface CreateTheaterDto {
  name: string
  address: string
  city: string
  state: string
  country: string
  zipCode?: string
  latitude?: number
  longitude?: number
  phoneNumber?: string
  email?: string
}

export type UpdateTheaterDto = Partial<CreateTheaterDto>

// ─── Screens ──────────────────────────────────────────────────────────────────

export interface Screen {
  id: string
  theaterId: string
  name: string
  totalRows: number
  totalColumns: number
  totalSeats: number
  isActive: boolean
  createdAt: string
}

export interface CreateScreenDto {
  theaterId: string
  name: string
  totalRows: number
  totalColumns: number
}

export type UpdateScreenDto = Partial<Omit<CreateScreenDto, 'theaterId'>>

// ─── Seats ────────────────────────────────────────────────────────────────────

export interface SeatCategory {
  id: string
  theaterId: string
  name: string
  basePrice: number
  colorCode?: string
  description?: string
}

export interface CreateSeatCategoryDto {
  theaterId: string
  name: string
  basePrice: number
  colorCode?: string
  description?: string
}

export interface Seat {
  id: string
  screenId: string
  seatCategoryId: string
  rowLabel: string
  seatNumber: number
  status: 'Available' | 'Booked' | 'Blocked' | 'Reserved'
  seatCategoryName?: string
  seatCategoryBasePrice?: number
  colorCode?: string
}

export interface CreateBulkSeatsDto {
  screenId: string
  rows: {
    rowLabel: string
    startSeat: number
    endSeat: number
    seatCategoryId: string
  }[]
}

// ─── Show Formats ─────────────────────────────────────────────────────────────

export interface ShowFormat {
  id: string
  name: string
  description?: string
}

export interface CreateShowFormatDto {
  name: string
  description?: string
}

// ─── Showtimes ────────────────────────────────────────────────────────────────

export interface ShowtimePricing {
  id: string
  seatCategoryId: string
  seatCategoryName: string
  price: number
}

export interface ShowtimeSeat {
  /** ShowtimeSeat id — use for seat locks and booking */
  id: string
  seatId: string
  rowLabel: string
  /** Physical seat label from the API (often numeric) */
  seatNumber: string | number
  status: 'Available' | 'Booked' | 'Blocked' | 'Reserved'
  seatCategoryId: string
  seatCategoryName: string
  price: number
  colorCode?: string
}

export interface Showtime {
  id: string
  movieId: string
  movieTitle?: string
  screenId: string
  screenName?: string
  theaterName?: string
  showFormatName?: string
  languageName?: string
  startTime: string
  endTime: string
  status: 'Scheduled' | 'Cancelled' | 'Completed'
  /** Seat-category prices from the API */
  pricings?: ShowtimePricing[]
  createdAt: string
}

export interface CreateShowtimeDto {
  movieId: string
  screenId: string
  showFormatId: string
  languageId: string
  startTime: string
  pricing?: { seatCategoryId: string; price: number }[]
}

export type UpdateShowtimeDto = Partial<Omit<CreateShowtimeDto, 'movieId' | 'screenId'>>

// ─── Seat Locks ───────────────────────────────────────────────────────────────

export interface SeatLockRequest {
  showtimeId: string
  seatIds: string[]
  sessionId: string
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Refunded' | 'Expired'
export type PaymentStatus = 'Pending' | 'Processing' | 'Succeeded' | 'Failed' | 'Refunded'

export interface BookingItem {
  id: string
  showtimeSeatId: string
  seatNumber: string
  rowLabel: string
  seatCategoryName: string
  price: number
  ticketNumber?: string
}

export interface BookingPayment {
  id: string
  stripePaymentIntentId: string
  amount: number
  currency: string
  status: PaymentStatus
  failureReason?: string
  paidAt?: string
}

export interface Booking {
  id: string
  userId: string
  userName: string
  userEmail: string
  showtimeId: string
  movieTitle: string
  theaterName: string
  screenName: string
  showtimeStart: string
  bookingReference: string
  status: BookingStatus
  totalAmount: number
  expiresAt: string
  confirmedAt?: string
  cancelledAt?: string
  cancellationReason?: string
  createdAt: string
  items: BookingItem[]
  payment?: BookingPayment
}

export interface PagedBookings {
  items: Booking[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreateBookingRequest {
  showtimeId: string
  seatIds: string[]
  sessionId: string
}

export interface CreateBookingResult {
  bookingId: string
  bookingReference: string
  totalAmount: number
  stripeClientSecret: string
  stripePaymentIntentId: string
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface TicketDto {
  id: string
  bookingId: string
  bookingReference: string
  ticketNumber: string
  qrCodeData: string
  isUsed: boolean
  usedAt?: string
  seatNumber: string
  rowLabel: string
  seatCategoryName: string
  price: number
  movieTitle: string
  theaterName: string
  screenName: string
  showtimeStart: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  metaData?: string
  createdAt: string
}

export interface PagedNotifications {
  items: Notification[]
  totalCount: number
  page: number
  pageSize: number
  unreadCount: number
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface UserAdmin {
  id: string
  fullName: string
  email: string
  role: string
  phoneNumber?: string
  profileImageUrl?: string
  isActive: boolean
  socialProvider?: string
  createdAt: string
  totalBookings: number
  totalSpent: number
}

export interface PagedUsers {
  items: UserAdmin[]
  totalCount: number
  page: number
  pageSize: number
}
