using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Enums;

namespace MovieBooking.Application.Interfaces;

public interface IBookingRepository
{
    Task AddAsync(Booking booking);
    Task<Booking?> GetByIdAsync(Guid id);
    Task<Booking?> GetByReferenceAsync(string reference);
    Task<(List<Booking> Items, int TotalCount)> GetByUserAsync(Guid userId, int page, int pageSize, BookingStatus? status);
    Task<(List<Booking> Items, int TotalCount)> GetAllAsync(int page, int pageSize, BookingStatus? status, Guid? userId, DateTime? fromDate, DateTime? toDate, string? search = null);
    Task<List<Booking>> GetExpiredPendingAsync();
    Task UpdateAsync(Booking booking);
}
