using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class ScreenRepository : IScreenRepository
{
    private readonly ApplicationDbContext _context;

    public ScreenRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Screen screen)
    {
        await _context.Screens.AddAsync(screen);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Screen>> GetByTheaterAsync(Guid theaterId)
        => await _context.Screens.AsNoTracking().Where(s => s.TheaterId == theaterId).OrderBy(s => s.Name).ToListAsync();

    public async Task<Screen?> GetByIdAsync(Guid id)
        => await _context.Screens
            .AsNoTracking()
            .Include(s => s.Theater)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task UpdateAsync(Screen screen)
    {
        _context.Screens.Update(screen);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Screen screen)
    {
        _context.Screens.Remove(screen);
        await _context.SaveChangesAsync();
    }
}
