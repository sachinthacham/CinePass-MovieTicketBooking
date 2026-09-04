using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class MoviePosterRepository : IMoviePosterRepository
{
    private readonly ApplicationDbContext _context;

    public MoviePosterRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(MoviePoster poster)
    {
        await _context.MoviePosters.AddAsync(poster);
        await _context.SaveChangesAsync();
    }

    public async Task<MoviePoster?> GetByIdAsync(Guid id)
        => await _context.MoviePosters.FindAsync(id);

    public async Task UpdateAsync(MoviePoster poster)
    {
        _context.MoviePosters.Update(poster);
        await _context.SaveChangesAsync();
    }

     public async Task DeleteAsync(MoviePoster poster)
    {
        _context.MoviePosters.Remove(poster);
        await _context.SaveChangesAsync();
    }

    public async Task<List<MoviePoster>> GetByMovieAsync(Guid movieId)
        => await _context.MoviePosters.AsNoTracking().Where(p => p.MovieId == movieId).ToListAsync();

    
    public async Task ClearPrimaryAsync(Guid movieId)
    {
        var posters = await _context.MoviePosters.Where(p => p.MovieId == movieId && p.IsPrimary).ToListAsync();
        posters.ForEach(p => p.IsPrimary = false);
        await _context.SaveChangesAsync();
    }
}
