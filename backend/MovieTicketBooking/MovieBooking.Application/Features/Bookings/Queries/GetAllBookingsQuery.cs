using MediatR;
using MovieBooking.Application.DTOs.Bookings;
using MovieBooking.Domain.Enums;

namespace MovieBooking.Application.Features.Bookings.Queries;

public record GetAllBookingsQuery(
    int Page = 1,
    int PageSize = 10,
    BookingStatus? Status = null,
    Guid? UserId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? Search = null
) : IRequest<PagedBookingsDto>;
