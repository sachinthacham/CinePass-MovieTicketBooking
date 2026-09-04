using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class TheaterRepository : ITheaterRepository
{
    private readonly ApplicationDbContext _context;

    public TheaterRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Theater theater)
    {
        await _context.Theaters.AddAsync(theater);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Theater>> GetAllAsync(string? city, bool? isActive)
    {
        var query = _context.Theaters
            .AsNoTracking()
            .Include(t => t.Facilities)
            .Include(t => t.Images)
            .Include(t => t.Screens)
            .Include(t => t.Ratings)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(t => t.City.ToLower().Contains(city.ToLower()));

        if (isActive.HasValue)
            query = query.Where(t => t.IsActive == isActive.Value);

        return await query.OrderBy(t => t.Name).ToListAsync();
    }

    public async Task<Theater?> GetByIdAsync(Guid id)
        => await _context.Theaters
            .AsNoTracking()
            .Include(t => t.Facilities)
            .Include(t => t.Images)
            .Include(t => t.Screens)
            .Include(t => t.Ratings)
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task UpdateAsync(Theater theater)
    {
        _context.Theaters.Update(theater);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Theater theater)
    {
        _context.Theaters.Remove(theater);
        await _context.SaveChangesAsync();
    }

    public async Task<decimal> GetAverageRatingAsync(Guid theaterId)
    {
        var ratings = await _context.TheaterRatings.AsNoTracking().Where(r => r.TheaterId == theaterId).ToListAsync();
        return ratings.Count == 0 ? 0 : (decimal)ratings.Average(r => (double)r.Rating);
    }

    public async Task<List<string>> GetDistinctCitiesAsync()
        => await _context.Theaters
            .AsNoTracking()
            .Where(t => t.IsActive)
            .Select(t => t.City)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
}
