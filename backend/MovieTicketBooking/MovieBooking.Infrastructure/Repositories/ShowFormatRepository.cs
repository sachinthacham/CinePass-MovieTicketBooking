using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class ShowFormatRepository : IShowFormatRepository
{
    private readonly ApplicationDbContext _context;

    public ShowFormatRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(ShowFormat format)
    {
        await _context.ShowFormats.AddAsync(format);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ShowFormat>> GetAllAsync()
        => await _context.ShowFormats.AsNoTracking().OrderBy(f => f.Name).ToListAsync();

    public async Task<ShowFormat?> GetByIdAsync(Guid id)
        => await _context.ShowFormats.FindAsync(id);

    public async Task UpdateAsync(ShowFormat format)
    {
        _context.ShowFormats.Update(format);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(ShowFormat format)
    {
        _context.ShowFormats.Remove(format);
        await _context.SaveChangesAsync();
    }
}
