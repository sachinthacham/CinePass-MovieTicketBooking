using MediatR;
using MovieBooking.Application.Common;
using MovieBooking.Application.Features.Bookings.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Enums;

namespace MovieBooking.Application.Features.Bookings.Handlers;

public class ConfirmBookingHandler : IRequestHandler<ConfirmBookingCommand, bool>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IBookingItemRepository _bookingItemRepository;
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly ITicketRepository _ticketRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IQrCodeService _qrCodeService;
    private readonly INotificationService _notificationService;
    private readonly ISeatAvailabilityNotifier _notifier;
    private readonly IUnitOfWork _unitOfWork;

    public ConfirmBookingHandler(
        IBookingRepository bookingRepository,
        IPaymentRepository paymentRepository,
        IBookingItemRepository bookingItemRepository,
        IShowtimeSeatRepository showtimeSeatRepository,
        ITicketRepository ticketRepository,
        INotificationRepository notificationRepository,
        IQrCodeService qrCodeService,
        INotificationService notificationService,
        ISeatAvailabilityNotifier notifier,
        IUnitOfWork unitOfWork)
    {
        _bookingRepository = bookingRepository;
        _paymentRepository = paymentRepository;
        _bookingItemRepository = bookingItemRepository;
        _showtimeSeatRepository = showtimeSeatRepository;
        _ticketRepository = ticketRepository;
        _notificationRepository = notificationRepository;
        _qrCodeService = qrCodeService;
        _notificationService = notificationService;
        _notifier = notifier;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(ConfirmBookingCommand request, CancellationToken cancellationToken)
    {
        var payment = await _paymentRepository.GetByPaymentIntentAsync(request.PaymentIntentId);
        if (payment == null) return false;

        var booking = await _bookingRepository.GetByIdAsync(payment.BookingId);
        if (booking == null) return false;

        // Stripe can deliver the same webhook event more than once. If this booking
        // is already confirmed, treat a repeat delivery as a successful no-op instead
        // of re-generating tickets/notifications.
        if (booking.Status == BookingStatus.Confirmed)
            return true;

        var showtimeSeats = new List<ShowtimeSeat>();

        // All of this must land together: if the seat-status update loses a
        // concurrency race (e.g. against the lock-cleanup background service), the
        // whole confirmation rolls back rather than leaving a Confirmed booking with
        // seats still marked Reserved. The webhook caller gets a 409 and Stripe will
        // retry the event, which is the intended recovery path for that rare race.
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            payment.Status = PaymentStatus.Succeeded;
            payment.StripeChargeId = request.ChargeId;
            payment.PaidAt = DateTime.UtcNow;
            await _paymentRepository.UpdateAsync(payment);

            booking.Confirm();
            await _bookingRepository.UpdateAsync(booking);

            var items = await _bookingItemRepository.GetByBookingAsync(booking.Id);
            var seatIds = items.Select(i => i.ShowtimeSeatId).ToList();
            showtimeSeats.AddRange(await _showtimeSeatRepository.GetByIdsAsync(seatIds));

            foreach (var seat in showtimeSeats)
            {
                seat.Status = SeatStatus.Booked;
                seat.BlockedUntil = null;
                seat.LockedBySession = null;
            }
            await _showtimeSeatRepository.UpdateRangeAsync(showtimeSeats);

            var tickets = items.Select(item => new Ticket
            {
                BookingId = booking.Id,
                BookingItemId = item.Id,
                TicketNumber = ReferenceCodeGenerator.GenerateTicketNumber(),
                QrCodeData = _qrCodeService.GenerateQrCodeBase64($"{booking.BookingReference}:{item.SeatNumber}"),
                IsUsed = false
            }).ToList();

            await _ticketRepository.AddRangeAsync(tickets);

            var notification = new Notification
            {
                UserId = booking.UserId,
                Title = "Booking Confirmed",
                Message = $"Your booking {booking.BookingReference} has been confirmed. Enjoy the show!",
                Type = "BookingConfirmation",
                IsRead = false,
                MetaData = System.Text.Json.JsonSerializer.Serialize(new { bookingId = booking.Id, reference = booking.BookingReference })
            };
            await _notificationRepository.AddAsync(notification);
        }, cancellationToken);

        // Side effects that talk to the outside world happen only after the
        // transaction has committed, and never roll back the confirmation if they fail.
        foreach (var seat in showtimeSeats)
            await _notifier.NotifySeatStatusChangedAsync(booking.ShowtimeId, seat.SeatId, "Booked");

        await _notificationService.SendBookingConfirmationAsync(booking);

        return true;
    }
}
