using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class MovieRepository : IMovieRepository
{
    private readonly ApplicationDbContext _context;

    public MovieRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Movie movie)
    {
        await _context.Movies.AddAsync(movie);
        await _context.SaveChangesAsync();
    }

    public async Task<(List<Movie> Items, int TotalCount)> GetAllAsync(
        int page, int pageSize, string? search,
        Guid? genreId, Guid? languageId,
        bool? isFeatured, bool? isComingSoon, bool? isActive,
        string? sortBy = null, string? cityFilter = null, Guid? formatId = null)
    {
        var query = _context.Movies
            .AsNoTracking()
            .Include(m => m.Genres).ThenInclude(mg => mg.Genre)
            .Include(m => m.Languages).ThenInclude(ml => ml.Language)
            .Include(m => m.Posters)
            .Include(m => m.Trailers)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(m => m.Title.Contains(search) || m.Description.Contains(search));

        if (genreId.HasValue)
            query = query.Where(m => m.Genres.Any(g => g.GenreId == genreId.Value));

        if (languageId.HasValue)
            query = query.Where(m => m.Languages.Any(l => l.LanguageId == languageId.Value));

        if (isFeatured.HasValue)
            query = query.Where(m => m.IsFeatured == isFeatured.Value);

        if (isComingSoon.HasValue)
            query = query.Where(m => m.IsComingSoon == isComingSoon.Value);

        if (isActive.HasValue)
            query = query.Where(m => m.IsActive == isActive.Value);

        if (!string.IsNullOrWhiteSpace(cityFilter))
            query = query.Where(m => m.Showtimes.Any(st => st.Screen.Theater.City == cityFilter));

        if (formatId.HasValue)
            query = query.Where(m => m.Showtimes.Any(st => st.ShowFormatId == formatId.Value));

        var totalCount = await query.CountAsync();

        IOrderedQueryable<Movie> orderedQuery = sortBy?.ToLower() switch
        {
            "rating" => query.OrderByDescending(m => m.AverageRating),
            "releasedate" => query.OrderByDescending(m => m.ReleaseDate),
            "title" => query.OrderBy(m => m.Title),
            _ => query.OrderByDescending(m => m.CreatedAt)
        };

        var items = await orderedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<Movie?> GetByIdAsync(Guid id)
        => await _context.Movies
            .AsNoTracking()
            .Include(m => m.Genres).ThenInclude(mg => mg.Genre)
            .Include(m => m.Languages).ThenInclude(ml => ml.Language)
            .Include(m => m.Posters)
            .Include(m => m.Trailers)
            .FirstOrDefaultAsync(m => m.Id == id);

    public async Task UpdateAsync(Movie movie)
    {
        _context.Movies.Update(movie);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Movie movie)
    {
        _context.Movies.Remove(movie);
        await _context.SaveChangesAsync();
    }
}
