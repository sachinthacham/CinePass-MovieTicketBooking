using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class SeatRepository : ISeatRepository
{
    private readonly ApplicationDbContext _context;

    public SeatRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddRangeAsync(IEnumerable<Seat> seats)
    {
        await _context.Seats.AddRangeAsync(seats);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Seat>> GetByScreenAsync(Guid screenId)
        => await _context.Seats
            .AsNoTracking()
            .Include(s => s.SeatCategory)
            .Where(s => s.ScreenId == screenId)
            .OrderBy(s => s.Row).ThenBy(s => s.Column)
            .ToListAsync();

    public async Task<List<Seat>> GetActiveByScreenAsync(Guid screenId)
        => await _context.Seats
            .AsNoTracking()
            .Where(s => s.ScreenId == screenId && s.IsActive && !s.IsBlocked)
            .OrderBy(s => s.Row).ThenBy(s => s.Column)
            .ToListAsync();

    public async Task<Seat?> GetByIdAsync(Guid id)
        => await _context.Seats.AsNoTracking().Include(s => s.SeatCategory).FirstOrDefaultAsync(s => s.Id == id);

    public async Task UpdateAsync(Seat seat)
    {
        _context.Seats.Update(seat);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateRangeAsync(IEnumerable<Seat> seats)
    {
        _context.Seats.UpdateRange(seats);
        await _context.SaveChangesAsync();
    }
}
