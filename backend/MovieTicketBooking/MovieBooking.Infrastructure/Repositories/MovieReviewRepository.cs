using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class MovieReviewRepository : IMovieReviewRepository
{
    private readonly ApplicationDbContext _context;

    public MovieReviewRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(MovieReview review)
    {
        await _context.MovieReviews.AddAsync(review);
        await _context.SaveChangesAsync();
    }

    public async Task<MovieReview?> GetByIdAsync(Guid id)
        => await _context.MovieReviews.FindAsync(id);

    public async Task<List<MovieReview>> GetByMovieAsync(Guid movieId, bool approvedOnly = true)
    {
        var query = _context.MovieReviews.AsNoTracking().Where(r => r.MovieId == movieId);
        if (approvedOnly) query = query.Where(r => r.IsApproved);
        return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task UpdateAsync(MovieReview review)
    {
        _context.MovieReviews.Update(review);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(MovieReview review)
    {
        _context.MovieReviews.Remove(review);
        await _context.SaveChangesAsync();
    }
}
