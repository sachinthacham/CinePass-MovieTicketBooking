using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Enums;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Infrastructure.BackgroundServices;

public class SeatLockCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SeatLockCleanupService> _logger;

    public SeatLockCleanupService(IServiceProvider serviceProvider, ILogger<SeatLockCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SeatLockCleanupService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await CleanupExpiredLocksAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SeatLockCleanupService");
            }

            try
            {
                await CleanupExpiredBookingsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error expiring stale pending bookings");
            }
        }

        _logger.LogInformation("SeatLockCleanupService stopped.");
    }

    private async Task CleanupExpiredLocksAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var showtimeSeatRepo = scope.ServiceProvider.GetRequiredService<IShowtimeSeatRepository>();

        var expiredSeats = await showtimeSeatRepo.GetLockedExpiredAsync();

        if (expiredSeats.Count == 0) return;

        _logger.LogInformation("Releasing {Count} expired seat locks.", expiredSeats.Count);

        foreach (var seat in expiredSeats)
        {
            seat.Status = SeatStatus.Available;
            seat.BlockedUntil = null;
            seat.LockedBySession = null;
        }

        try
        {
            await showtimeSeatRepo.UpdateRangeAsync(expiredSeats);
            _logger.LogInformation("Expired seat locks released.");
        }
        catch (SeatUnavailableException)
        {
            // A seat in this batch was booked/re-locked between the read above and this
            // write (e.g. its payment confirmed right as its lock was about to expire).
            // That seat no longer needs releasing — nothing to do, just move on.
            _logger.LogInformation("Some expired locks were already superseded by a newer booking; skipped.");
        }
    }

    /// <summary>
    /// A Booking stays Pending from creation until its Stripe payment succeeds. If the
    /// user abandons checkout, the seat lock above expires and the seat becomes bookable
    /// again — but without this pass, the orphaned Booking row itself would stay Pending
    /// forever with no automatic cancellation.
    /// </summary>
    private async Task CleanupExpiredBookingsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var bookingRepo = scope.ServiceProvider.GetRequiredService<IBookingRepository>();

        var expiredBookings = await bookingRepo.GetExpiredPendingAsync();

        if (expiredBookings.Count == 0) return;

        _logger.LogInformation("Expiring {Count} stale pending bookings.", expiredBookings.Count);

        foreach (var booking in expiredBookings)
        {
            try
            {
                booking.Expire();
                await bookingRepo.UpdateAsync(booking);
            }
            catch (InvalidBookingStateException)
            {
                // The booking was confirmed or cancelled by another request in the
                // brief window between the read above and this write — leave it alone.
            }
        }
    }
}
