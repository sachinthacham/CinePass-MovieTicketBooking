using MovieBooking.Application.Interfaces;
using MovieBooking.Infrastructure.Data;
using MovieBooking.Infrastructure.Repositories;

namespace MovieBooking.Api.Extensions;

public static class RepositoryExtensions
{
    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IMovieRepository, MovieRepository>();
        services.AddScoped<IGenreRepository, GenreRepository>();
        services.AddScoped<ILanguageRepository, LanguageRepository>();
        services.AddScoped<IMovieRatingRepository, MovieRatingRepository>();
        services.AddScoped<IMovieReviewRepository, MovieReviewRepository>();
        services.AddScoped<IMovieTrailerRepository, MovieTrailerRepository>();
        services.AddScoped<IMoviePosterRepository, MoviePosterRepository>();
        services.AddScoped<ITheaterRepository, TheaterRepository>();
        services.AddScoped<ITheaterFacilityRepository, TheaterFacilityRepository>();
        services.AddScoped<ITheaterImageRepository, TheaterImageRepository>();
        services.AddScoped<ITheaterRatingRepository, TheaterRatingRepository>();
        services.AddScoped<IScreenRepository, ScreenRepository>();
        services.AddScoped<ISeatCategoryRepository, SeatCategoryRepository>();
        services.AddScoped<ISeatRepository, SeatRepository>();
        services.AddScoped<IShowFormatRepository, ShowFormatRepository>();
        services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
        services.AddScoped<IShowtimeSeatRepository, ShowtimeSeatRepository>();
        services.AddScoped<IShowtimePricingRepository, ShowtimePricingRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IBookingItemRepository, BookingItemRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<ITicketRepository, TicketRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
