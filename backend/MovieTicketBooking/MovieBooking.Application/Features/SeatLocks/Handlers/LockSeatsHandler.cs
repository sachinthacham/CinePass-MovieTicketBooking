using MediatR;
using MovieBooking.Application.Features.SeatLocks.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Enums;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Application.Features.SeatLocks.Handlers;

public class LockSeatsHandler : IRequestHandler<LockSeatsCommand, bool>
{
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly IBookingSettings _settings;
    private readonly ISeatAvailabilityNotifier _notifier;

    public LockSeatsHandler(IShowtimeSeatRepository showtimeSeatRepository, IBookingSettings settings, ISeatAvailabilityNotifier notifier)
    {
        _showtimeSeatRepository = showtimeSeatRepository;
        _settings = settings;
        _notifier = notifier;
    }

    public async Task<bool> Handle(LockSeatsCommand request, CancellationToken cancellationToken)
    {
        var seats = await _showtimeSeatRepository.GetByIdsAsync(request.SeatIds);

        var unavailable = seats.Where(s =>
            s.Status != SeatStatus.Available &&
            !(s.Status == SeatStatus.Reserved && s.LockedBySession == request.SessionId)).ToList();

        if (unavailable.Any())
            throw new SeatUnavailableException($"{unavailable.Count} seat(s) are not available.");

        var lockMinutes = _settings.LockDurationMinutes;

        foreach (var seat in seats)
        {
            seat.Status = SeatStatus.Reserved;
            seat.BlockedUntil = DateTime.UtcNow.AddMinutes(lockMinutes);
            seat.LockedBySession = request.SessionId;
        }

        await _showtimeSeatRepository.UpdateRangeAsync(seats);

        foreach (var seat in seats)
            await _notifier.NotifySeatStatusChangedAsync(request.ShowtimeId, seat.SeatId, "Reserved");

        return true;
    }
}
