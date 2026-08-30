using MediatR;
using MovieBooking.Application.Features.Bookings.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Enums;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Application.Features.Bookings.Handlers;

public class CancelBookingHandler : IRequestHandler<CancelBookingCommand, bool>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IBookingItemRepository _bookingItemRepository;
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IPaymentService _paymentService;
    private readonly INotificationService _notificationService;
    private readonly ISeatAvailabilityNotifier _notifier;
    private readonly IUnitOfWork _unitOfWork;

    public CancelBookingHandler(
        IBookingRepository bookingRepository,
        IPaymentRepository paymentRepository,
        IBookingItemRepository bookingItemRepository,
        IShowtimeSeatRepository showtimeSeatRepository,
        INotificationRepository notificationRepository,
        IPaymentService paymentService,
        INotificationService notificationService,
        ISeatAvailabilityNotifier notifier,
        IUnitOfWork unitOfWork)
    {
        _bookingRepository = bookingRepository;
        _paymentRepository = paymentRepository;
        _bookingItemRepository = bookingItemRepository;
        _showtimeSeatRepository = showtimeSeatRepository;
        _notificationRepository = notificationRepository;
        _paymentService = paymentService;
        _notificationService = notificationService;
        _notifier = notifier;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(CancelBookingCommand request, CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(request.BookingId)
            ?? throw new EntityNotFoundException(nameof(Booking), request.BookingId);

        if (request.RequestingUserRole != "Admin" && booking.UserId != request.RequestingUserId)
            throw new ForbiddenOperationException("You cannot cancel this booking.");

        // booking.Cancel() (called inside the transaction below) throws
        // InvalidBookingStateException for this same case — checked up front too so
        // we fail before ever attempting a refund.
        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Refunded)
            throw new InvalidBookingStateException($"Booking {booking.BookingReference} is already {booking.Status}.");

        // Attempt the refund BEFORE opening a transaction or mutating any state. If
        // RefundPaymentAsync throws, nothing below has been touched, so the booking/
        // seats/payment are left exactly as they were instead of ending up in an
        // inconsistent half-cancelled state.
        var payment = await _paymentRepository.GetByBookingAsync(booking.Id);
        var willRefund = payment != null && payment.Status == PaymentStatus.Succeeded && payment.StripeChargeId != null;

        if (willRefund)
            await _paymentService.RefundPaymentAsync(payment!.StripeChargeId!);

        var seats = new List<ShowtimeSeat>();

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            booking.Cancel(request.Reason);

            if (willRefund)
            {
                payment!.Status = PaymentStatus.Refunded;
                await _paymentRepository.UpdateAsync(payment);
                booking.MarkRefunded();
            }

            await _bookingRepository.UpdateAsync(booking);

            var items = await _bookingItemRepository.GetByBookingAsync(booking.Id);
            var seatIds = items.Select(i => i.ShowtimeSeatId).ToList();
            seats.AddRange(await _showtimeSeatRepository.GetByIdsAsync(seatIds));

            foreach (var seat in seats)
            {
                seat.Status = SeatStatus.Available;
                seat.BlockedUntil = null;
                seat.LockedBySession = null;
            }
            await _showtimeSeatRepository.UpdateRangeAsync(seats);

            var notification = new Notification
            {
                UserId = booking.UserId,
                Title = "Booking Cancelled",
                Message = $"Your booking {booking.BookingReference} has been cancelled.",
                Type = "BookingCancellation",
                IsRead = false,
                MetaData = System.Text.Json.JsonSerializer.Serialize(new { bookingId = booking.Id, reference = booking.BookingReference })
            };
            await _notificationRepository.AddAsync(notification);
        }, cancellationToken);

        foreach (var seat in seats)
            await _notifier.NotifySeatStatusChangedAsync(booking.ShowtimeId, seat.SeatId, "Available");

        await _notificationService.SendCancellationAsync(booking);

        return true;
    }
}
