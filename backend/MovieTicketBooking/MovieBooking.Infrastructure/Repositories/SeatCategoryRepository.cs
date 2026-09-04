using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class SeatCategoryRepository : ISeatCategoryRepository
{
    private readonly ApplicationDbContext _context;

    public SeatCategoryRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(SeatCategory category)
    {
        await _context.SeatCategories.AddAsync(category);
        await _context.SaveChangesAsync();
    }

    public async Task<List<SeatCategory>> GetAllAsync()
        => await _context.SeatCategories.AsNoTracking().OrderBy(c => c.Name).ToListAsync();

    public async Task<SeatCategory?> GetByIdAsync(Guid id)
        => await _context.SeatCategories.FindAsync(id);

    public async Task UpdateAsync(SeatCategory category)
    {
        _context.SeatCategories.Update(category);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(SeatCategory category)
    {
        _context.SeatCategories.Remove(category);
        await _context.SaveChangesAsync();
    }
}
