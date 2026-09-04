using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class ShowtimeRepository : IShowtimeRepository
{
    private readonly ApplicationDbContext _context;

    public ShowtimeRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Showtime showtime)
    {
        await _context.Showtimes.AddAsync(showtime);
        await _context.SaveChangesAsync();
    }

    public async Task<Showtime?> GetByIdAsync(Guid id)
        => await _context.Showtimes
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(s => s.ShowFormat)
            .Include(s => s.Language)
            .Include(s => s.Pricings).ThenInclude(p => p.SeatCategory)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<List<Showtime>> GetByMovieAsync(Guid movieId, DateTime? date)
    {
        var query = _context.Showtimes
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(s => s.ShowFormat)
            .Include(s => s.Language)
            .Include(s => s.Pricings).ThenInclude(p => p.SeatCategory)
            .Where(s => s.MovieId == movieId);

        if (date.HasValue)
            query = query.Where(s => s.StartTime.Date == date.Value.Date);

        return await query.OrderBy(s => s.StartTime).ToListAsync();
    }

    public async Task<List<Showtime>> GetByTheaterAsync(Guid theaterId, DateTime? date)
    {
        var query = _context.Showtimes
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(s => s.ShowFormat)
            .Include(s => s.Language)
            .Include(s => s.Pricings).ThenInclude(p => p.SeatCategory)
            .Where(s => s.Screen.TheaterId == theaterId);

        if (date.HasValue)
            query = query.Where(s => s.StartTime.Date == date.Value.Date);

        return await query.OrderBy(s => s.StartTime).ToListAsync();
    }

    public async Task<List<Showtime>> GetByScreenAsync(Guid screenId, DateTime? date)
    {
        var query = _context.Showtimes
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(s => s.ShowFormat)
            .Include(s => s.Language)
            .Include(s => s.Pricings).ThenInclude(p => p.SeatCategory)
            .Where(s => s.ScreenId == screenId);

        if (date.HasValue)
            query = query.Where(s => s.StartTime.Date == date.Value.Date);

        return await query.OrderBy(s => s.StartTime).ToListAsync();
    }

    public async Task<List<Showtime>> GetRecentAsync(int take)
        => await _context.Showtimes
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Screen).ThenInclude(sc => sc.Theater)
            .Include(s => s.ShowFormat)
            .Include(s => s.Language)
            .Include(s => s.Pricings).ThenInclude(p => p.SeatCategory)
            .OrderByDescending(s => s.StartTime)
            .Take(take)
            .ToListAsync();

    public Task<int> CountAsync(CancellationToken cancellationToken = default)
        => _context.Showtimes.CountAsync(cancellationToken);

    public async Task UpdateAsync(Showtime showtime)
    {
        _context.Showtimes.Update(showtime);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Showtime showtime)
    {
        _context.Showtimes.Remove(showtime);
        await _context.SaveChangesAsync();
    }
}
