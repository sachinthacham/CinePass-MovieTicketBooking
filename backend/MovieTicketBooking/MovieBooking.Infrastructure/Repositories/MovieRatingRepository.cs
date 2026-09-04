using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class MovieRatingRepository : IMovieRatingRepository
{
    private readonly ApplicationDbContext _context;

    public MovieRatingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(MovieRating rating)
    {
        await _context.MovieRatings.AddAsync(rating);
        await _context.SaveChangesAsync();
    }

    public async Task<MovieRating?> GetByUserAndMovieAsync(Guid userId, Guid movieId)
        => await _context.MovieRatings.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == userId && r.MovieId == movieId);

    public async Task<List<MovieRating>> GetByMovieAsync(Guid movieId)
        => await _context.MovieRatings.AsNoTracking().Where(r => r.MovieId == movieId).ToListAsync();

    public async Task UpdateAsync(MovieRating rating)
    {
        _context.MovieRatings.Update(rating);
        await _context.SaveChangesAsync();
    }

    public async Task<decimal> GetAverageRatingAsync(Guid movieId)
    {
        var ratings = await _context.MovieRatings.AsNoTracking().Where(r => r.MovieId == movieId).ToListAsync();
        return ratings.Count == 0 ? 0 : ratings.Average(r => r.Rating);
    }

    public async Task<int> GetTotalRatingsAsync(Guid movieId)
        => await _context.MovieRatings.CountAsync(r => r.MovieId == movieId);
}
