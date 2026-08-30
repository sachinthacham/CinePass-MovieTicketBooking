using MovieBooking.Domain.Common;
using MovieBooking.Domain.Enums;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Domain.Entities;

public class Booking : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public Guid ShowtimeId { get; set; }
    public Showtime Showtime { get; set; } = default!;

    public string BookingReference { get; set; } = default!;
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public decimal TotalAmount { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    /// <summary>
    /// Optimistic concurrency token. Guards against a booking being confirmed and
    /// cancelled at the same time by two concurrent requests (e.g. a Stripe webhook
    /// and a user-initiated cancel racing each other).
    /// </summary>
    public byte[] RowVersion { get; set; } = default!;

    public ICollection<BookingItem> BookingItems { get; set; } = [];
    public Payment? Payment { get; set; }
    public ICollection<Ticket> Tickets { get; set; } = [];

    /// <summary>
    /// Not yet called anywhere — handlers still set Status directly.
    /// Wired up in Phase 2 once every call site moves to these guard methods together.
    /// </summary>
    public void Confirm()
    {
        if (Status != BookingStatus.Pending)
            throw new InvalidBookingStateException(
                $"Booking {BookingReference} cannot be confirmed from status '{Status}'.");

        Status = BookingStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;
    }

    public void Cancel(string? reason)
    {
        if (Status is BookingStatus.Cancelled or BookingStatus.Refunded)
            throw new InvalidBookingStateException(
                $"Booking {BookingReference} is already {Status} and cannot be cancelled again.");

        Status = BookingStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancellationReason = reason;
    }

    public void MarkRefunded()
    {
        if (Status != BookingStatus.Cancelled)
            throw new InvalidBookingStateException(
                $"Booking {BookingReference} must be cancelled before it can be marked refunded (current status '{Status}').");

        Status = BookingStatus.Refunded;
    }

    public void Expire()
    {
        if (Status != BookingStatus.Pending)
            throw new InvalidBookingStateException(
                $"Booking {BookingReference} cannot expire from status '{Status}'.");

        Status = BookingStatus.Expired;
    }
}
