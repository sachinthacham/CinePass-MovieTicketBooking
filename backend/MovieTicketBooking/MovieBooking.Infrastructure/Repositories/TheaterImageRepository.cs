using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class TheaterImageRepository : ITheaterImageRepository
{
    private readonly ApplicationDbContext _context;

    public TheaterImageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(TheaterImage image)
    {
        await _context.TheaterImages.AddAsync(image);
        await _context.SaveChangesAsync();
    }

    public async Task<TheaterImage?> GetByIdAsync(Guid id)
        => await _context.TheaterImages.FindAsync(id);

    public async Task<List<TheaterImage>> GetByTheaterAsync(Guid theaterId)
        => await _context.TheaterImages.AsNoTracking().Where(i => i.TheaterId == theaterId).ToListAsync();

    public async Task UpdateAsync(TheaterImage image)
    {
        _context.TheaterImages.Update(image);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(TheaterImage image)
    {
        _context.TheaterImages.Remove(image);
        await _context.SaveChangesAsync();
    }

    public async Task ClearPrimaryAsync(Guid theaterId)
    {
        var images = await _context.TheaterImages.Where(i => i.TheaterId == theaterId && i.IsPrimary).ToListAsync();
        images.ForEach(i => i.IsPrimary = false);
        await _context.SaveChangesAsync();
    }
}
