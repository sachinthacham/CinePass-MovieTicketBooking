using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Enums;
using MovieBooking.Domain.Exceptions;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly ApplicationDbContext _context;

    public BookingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Booking booking)
    {
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();
    }

    public async Task<Booking?> GetByIdAsync(Guid id)
        => await _context.Bookings
            .Include(b => b.User)
            .Include(b => b.Showtime).ThenInclude(s => s.Movie)
            .Include(b => b.Showtime).ThenInclude(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(b => b.BookingItems).ThenInclude(bi => bi.ShowtimeSeat)
            .Include(b => b.Payment)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Booking?> GetByReferenceAsync(string reference)
        => await _context.Bookings
            .Include(b => b.User)
            .Include(b => b.Showtime).ThenInclude(s => s.Movie)
            .Include(b => b.Showtime).ThenInclude(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(b => b.BookingItems)
            .Include(b => b.Payment)
            .FirstOrDefaultAsync(b => b.BookingReference == reference);

    public async Task<(List<Booking> Items, int TotalCount)> GetByUserAsync(Guid userId, int page, int pageSize, BookingStatus? status)
    {
        var query = _context.Bookings
            .Include(b => b.Showtime).ThenInclude(s => s.Movie)
            .Include(b => b.Showtime).ThenInclude(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(b => b.BookingItems)
            .Include(b => b.Payment)
            .Where(b => b.UserId == userId)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(b => b.Status == status.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<(List<Booking> Items, int TotalCount)> GetAllAsync(int page, int pageSize, BookingStatus? status, Guid? userId, DateTime? fromDate, DateTime? toDate, string? search = null)
    {
        var query = _context.Bookings
            .Include(b => b.User)
            .Include(b => b.Showtime).ThenInclude(s => s.Movie)
            .Include(b => b.Showtime).ThenInclude(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(b => b.BookingItems)
            .Include(b => b.Payment)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(b => b.Status == status.Value);

        if (userId.HasValue)
            query = query.Where(b => b.UserId == userId.Value);

        if (fromDate.HasValue)
            query = query.Where(b => b.CreatedAt >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(b => b.CreatedAt <= toDate.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b =>
                b.BookingReference.Contains(search) ||
                b.User.FullName.Contains(search) ||
                b.User.Email.Contains(search) ||
                b.Showtime.Movie.Title.Contains(search));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<List<Booking>> GetExpiredPendingAsync()
        => await _context.Bookings
            .Include(b => b.BookingItems)
            .Where(b => b.Status == BookingStatus.Pending && b.ExpiresAt < DateTime.UtcNow)
            .ToListAsync();

    public async Task UpdateAsync(Booking booking)
    {
        _context.Bookings.Update(booking);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvalidBookingStateException(
                $"Booking {booking.BookingReference} was modified by another request. Please refresh and try again.");
        }
    }
}
