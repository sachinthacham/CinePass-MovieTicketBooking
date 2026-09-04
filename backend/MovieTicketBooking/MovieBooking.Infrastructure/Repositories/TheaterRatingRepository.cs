using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class TheaterRatingRepository : ITheaterRatingRepository
{
    private readonly ApplicationDbContext _context;

    public TheaterRatingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(TheaterRating rating)
    {
        await _context.TheaterRatings.AddAsync(rating);
        await _context.SaveChangesAsync();
    }

    public async Task<TheaterRating?> GetByUserAndTheaterAsync(Guid userId, Guid theaterId)
        => await _context.TheaterRatings.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == userId && r.TheaterId == theaterId);

    public async Task<List<TheaterRating>> GetByTheaterAsync(Guid theaterId)
        => await _context.TheaterRatings.AsNoTracking().Where(r => r.TheaterId == theaterId).OrderByDescending(r => r.CreatedAt).ToListAsync();

    public async Task UpdateAsync(TheaterRating rating)
    {
        _context.TheaterRatings.Update(rating);
        await _context.SaveChangesAsync();
    }

    public async Task<decimal> GetAverageRatingAsync(Guid theaterId)
    {
        var ratings = await _context.TheaterRatings.AsNoTracking().Where(r => r.TheaterId == theaterId).ToListAsync();
        return ratings.Count == 0 ? 0 : (decimal)ratings.Average(r => (double)r.Rating);
    }
}
