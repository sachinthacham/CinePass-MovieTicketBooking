using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class GenreRepository : IGenreRepository
{
    private readonly ApplicationDbContext _context;

    public GenreRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Genre genre)
    {
        await _context.Genres.AddAsync(genre);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Genre>> GetAllAsync()
        => await _context.Genres.AsNoTracking().OrderBy(g => g.Name).ToListAsync();

    public async Task<Genre?> GetByIdAsync(Guid id)
        => await _context.Genres.FindAsync(id);

    public async Task<Genre?> GetByNameAsync(string name)
        => await _context.Genres.AsNoTracking().FirstOrDefaultAsync(g => g.Name.ToLower() == name.ToLower());

    public async Task UpdateAsync(Genre genre)
    {
        _context.Genres.Update(genre);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Genre genre)
    {
        _context.Genres.Remove(genre);
        await _context.SaveChangesAsync();
    }
}
