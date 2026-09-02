using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class LanguageRepository : ILanguageRepository
{
    private readonly ApplicationDbContext _context;

    public LanguageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Language language)
    {
        await _context.Languages.AddAsync(language);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Language>> GetAllAsync()
        => await _context.Languages.AsNoTracking().OrderBy(l => l.Name).ToListAsync();

    public async Task<Language?> GetByIdAsync(Guid id)
        => await _context.Languages.FindAsync(id);

    public async Task UpdateAsync(Language language)
    {
        _context.Languages.Update(language);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Language language)
    {
        _context.Languages.Remove(language);
        await _context.SaveChangesAsync();
    }
}
