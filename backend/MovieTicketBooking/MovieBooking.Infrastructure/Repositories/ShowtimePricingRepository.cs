using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class ShowtimePricingRepository : IShowtimePricingRepository
{
    private readonly ApplicationDbContext _context;

    public ShowtimePricingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(ShowtimePricing pricing)
    {
        await _context.ShowtimePricings.AddAsync(pricing);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ShowtimePricing>> GetByShowtimeAsync(Guid showtimeId)
        => await _context.ShowtimePricings
            .AsNoTracking()
            .Include(p => p.SeatCategory)
            .Where(p => p.ShowtimeId == showtimeId)
            .ToListAsync();

    public async Task<ShowtimePricing?> GetByShowtimeAndCategoryAsync(Guid showtimeId, Guid seatCategoryId)
        => await _context.ShowtimePricings
            .AsNoTracking()
            .Include(p => p.SeatCategory)
            .FirstOrDefaultAsync(p => p.ShowtimeId == showtimeId && p.SeatCategoryId == seatCategoryId);

    public async Task UpdateAsync(ShowtimePricing pricing)
    {
        _context.ShowtimePricings.Update(pricing);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(ShowtimePricing pricing)
    {
        _context.ShowtimePricings.Remove(pricing);
        await _context.SaveChangesAsync();
    }
}
