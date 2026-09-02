using MediatR;
using MovieBooking.Application.DTOs.Bookings;
using MovieBooking.Application.Features.Bookings.Queries;
using MovieBooking.Application.Interfaces;

namespace MovieBooking.Application.Features.Bookings.Handlers;

public class GetAllBookingsHandler : IRequestHandler<GetAllBookingsQuery, PagedBookingsDto>
{
    private readonly IBookingRepository _bookingRepository;

    public GetAllBookingsHandler(IBookingRepository bookingRepository)
    {
        _bookingRepository = bookingRepository;
    }

    public async Task<PagedBookingsDto> Handle(GetAllBookingsQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _bookingRepository.GetAllAsync(
            request.Page, request.PageSize, request.Status, request.UserId, request.FromDate, request.ToDate, request.Search);

        return new PagedBookingsDto
        {
            Items = items.Select(b => BookingMappingHelper.ToDto(b, [])).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
