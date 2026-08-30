using MovieBooking.Domain.Common;
using MovieBooking.Domain.Enums;

namespace MovieBooking.Domain.Entities;

public class ShowtimeSeat : BaseEntity
{
    public Guid ShowtimeId { get; set; }
    public Showtime Showtime { get; set; } = default!;

    public Guid SeatId { get; set; }
    public Seat Seat { get; set; } = default!;

    public SeatStatus Status { get; set; } = SeatStatus.Available;
    public DateTime? BlockedUntil { get; set; }
    public string? LockedBySession { get; set; }

    /// <summary>
    /// Optimistic concurrency token. Prevents two concurrent requests from both
    /// reading this seat as Available and both successfully writing a lock/booking
    /// to it — the second write fails with a concurrency conflict instead of
    /// silently overwriting the first (see ShowtimeSeatRepository).
    /// </summary>
    public byte[] RowVersion { get; set; } = default!;

    public ICollection<BookingItem> BookingItems { get; set; } = [];
}
