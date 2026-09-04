using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class MovieTrailerRepository : IMovieTrailerRepository
{
    private readonly ApplicationDbContext _context;

    public MovieTrailerRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(MovieTrailer trailer)
    {
        await _context.MovieTrailers.AddAsync(trailer);
        await _context.SaveChangesAsync();
    }

    public async Task<MovieTrailer?> GetByIdAsync(Guid id)
        => await _context.MovieTrailers.FindAsync(id);

    public async Task<List<MovieTrailer>> GetByMovieAsync(Guid movieId)
        => await _context.MovieTrailers.AsNoTracking().Where(t => t.MovieId == movieId).ToListAsync();

    public async Task UpdateAsync(MovieTrailer trailer)
    {
        _context.MovieTrailers.Update(trailer);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(MovieTrailer trailer)
    {
        _context.MovieTrailers.Remove(trailer);
        await _context.SaveChangesAsync();
    }
}
