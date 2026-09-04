using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class TheaterFacilityRepository : ITheaterFacilityRepository
{
    private readonly ApplicationDbContext _context;

    public TheaterFacilityRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(TheaterFacility facility)
    {
        await _context.TheaterFacilities.AddAsync(facility);
        await _context.SaveChangesAsync();
    }

    public async Task<List<TheaterFacility>> GetByTheaterAsync(Guid theaterId)
        => await _context.TheaterFacilities.AsNoTracking().Where(f => f.TheaterId == theaterId).ToListAsync();

    public async Task<TheaterFacility?> GetByIdAsync(Guid id)
        => await _context.TheaterFacilities.FindAsync(id);

    public async Task DeleteAsync(TheaterFacility facility)
    {
        _context.TheaterFacilities.Remove(facility);
        await _context.SaveChangesAsync();
    }
}
