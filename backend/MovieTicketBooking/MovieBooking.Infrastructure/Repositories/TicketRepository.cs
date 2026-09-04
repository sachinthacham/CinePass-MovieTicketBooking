using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Infrastructure.Repositories;

public class TicketRepository : ITicketRepository
{
    private readonly ApplicationDbContext _context;

    public TicketRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddRangeAsync(IEnumerable<Ticket> tickets)
    {
        await _context.Tickets.AddRangeAsync(tickets);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Ticket>> GetByBookingAsync(Guid bookingId)
        => await _context.Tickets
            .AsNoTracking()
            .Include(t => t.BookingItem)
            .Where(t => t.BookingId == bookingId)
            .ToListAsync();

    public async Task<Ticket?> GetByNumberAsync(string ticketNumber)
        => await _context.Tickets
            .AsNoTracking()
            .Include(t => t.BookingItem)
            .FirstOrDefaultAsync(t => t.TicketNumber == ticketNumber);

    public async Task UpdateAsync(Ticket ticket)
    {
        _context.Tickets.Update(ticket);
        await _context.SaveChangesAsync();
    }
}
