using MediatR;
using MovieBooking.Application.Common;
using MovieBooking.Application.DTOs.Bookings;
using MovieBooking.Application.Features.Bookings.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Enums;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Application.Features.Bookings.Handlers;

public class CreateBookingHandler : IRequestHandler<CreateBookingCommand, CreateBookingResultDto>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IBookingItemRepository _bookingItemRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly IShowtimeRepository _showtimeRepository;
    private readonly IPaymentService _paymentService;
    private readonly IBookingSettings _settings;
    private readonly IUnitOfWork _unitOfWork;

    public CreateBookingHandler(
        IBookingRepository bookingRepository,
        IBookingItemRepository bookingItemRepository,
        IPaymentRepository paymentRepository,
        IShowtimeSeatRepository showtimeSeatRepository,
        IShowtimeRepository showtimeRepository,
        IPaymentService paymentService,
        IBookingSettings settings,
        IUnitOfWork unitOfWork)
    {
        _bookingRepository = bookingRepository;
        _bookingItemRepository = bookingItemRepository;
        _paymentRepository = paymentRepository;
        _showtimeSeatRepository = showtimeSeatRepository;
        _showtimeRepository = showtimeRepository;
        _paymentService = paymentService;
        _settings = settings;
        _unitOfWork = unitOfWork;
    }

    public async Task<CreateBookingResultDto> Handle(CreateBookingCommand request, CancellationToken cancellationToken)
    {
        var showtime = await _showtimeRepository.GetByIdAsync(request.ShowtimeId)
            ?? throw new EntityNotFoundException(nameof(Showtime), request.ShowtimeId);

        var seats = await _showtimeSeatRepository.GetByIdsAsync(request.SeatIds);

        foreach (var seat in seats)
        {
            if (seat.Status != SeatStatus.Reserved || seat.LockedBySession != request.SessionId)
                throw new SeatUnavailableException($"Seat {seat.SeatId} is not reserved for this session.");
        }

        var expiryMinutes = _settings.ExpiryMinutes;
        var bookingRef = ReferenceCodeGenerator.GenerateBookingReference();

        var booking = new Booking
        {
            UserId = request.UserId,
            ShowtimeId = request.ShowtimeId,
            BookingReference = bookingRef,
            Status = BookingStatus.Pending,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes)
        };

        var items = new List<BookingItem>();
        decimal total = 0m;

        foreach (var seat in seats)
        {
            var price = showtime.Pricings.FirstOrDefault(p => p.SeatCategoryId == seat.Seat.SeatCategory.Id)?.Price
                        ?? seat.Seat.SeatCategory.DefaultPrice;

            var item = new BookingItem
            {
                BookingId = booking.Id,
                ShowtimeSeatId = seat.Id,
                SeatNumber = seat.Seat.SeatNumber,
                RowLabel = seat.Seat.Row,
                SeatCategoryName = seat.Seat.SeatCategory.Name,
                Price = price
            };
            items.Add(item);
            total += price;
        }

        booking.TotalAmount = total;

        var metadata = new Dictionary<string, string>
        {
            ["bookingId"] = booking.Id.ToString(),
            ["bookingReference"] = bookingRef,
            ["userId"] = request.UserId.ToString()
        };

        // Talk to Stripe before opening a DB transaction — a slow/failed external call
        // should never hold a database transaction open.
        var (paymentIntentId, clientSecret) = await _paymentService.CreatePaymentIntentAsync(total, "usd", metadata);

        var payment = new Payment
        {
            BookingId = booking.Id,
            StripePaymentIntentId = paymentIntentId,
            Amount = total,
            Currency = "usd",
            Status = PaymentStatus.Pending
        };

        // Booking + its items + its payment record must all land together — a crash
        // between these writes previously could leave a Booking row with no items or
        // no payment attached to it.
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _bookingRepository.AddAsync(booking);
            await _bookingItemRepository.AddRangeAsync(items);
            await _paymentRepository.AddAsync(payment);
        }, cancellationToken);

        return new CreateBookingResultDto
        {
            BookingId = booking.Id,
            BookingReference = bookingRef,
            TotalAmount = total,
            StripeClientSecret = clientSecret,
            StripePaymentIntentId = paymentIntentId
        };
    }
}
