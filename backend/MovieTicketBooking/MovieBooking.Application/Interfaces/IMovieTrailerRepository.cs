using MovieBooking.Domain.Entities;

namespace MovieBooking.Application.Interfaces;

public interface IMovieTrailerRepository
{
   Task AddAsync(MovieTrailer trailer);
    Task<MovieTrailer?> GetByIdAsync(Guid id);
    Task<List<MovieTrailer>> GetByMovieAsync(Guid movieId);
    Task UpdateAsync(MovieTrailer trailer);
    Task DeleteAsync(MovieTrailer trailer);
} 
