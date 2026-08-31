using Microsoft.EntityFrameworkCore;
using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Enums;

namespace MovieBooking.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<Language> Languages => Set<Language>();
    public DbSet<Movie> Movies => Set<Movie>();
    public DbSet<MovieGenre> MovieGenres => Set<MovieGenre>();
    public DbSet<MovieLanguage> MovieLanguages => Set<MovieLanguage>();
    public DbSet<MovieTrailer> MovieTrailers => Set<MovieTrailer>();
    public DbSet<MoviePoster> MoviePosters => Set<MoviePoster>();
    public DbSet<MovieRating> MovieRatings => Set<MovieRating>();
    public DbSet<MovieReview> MovieReviews => Set<MovieReview>();
    public DbSet<Theater> Theaters => Set<Theater>();
    public DbSet<TheaterFacility> TheaterFacilities => Set<TheaterFacility>();
    public DbSet<TheaterImage> TheaterImages => Set<TheaterImage>();
    public DbSet<TheaterRating> TheaterRatings => Set<TheaterRating>();
    public DbSet<Screen> Screens => Set<Screen>();
    public DbSet<SeatCategory> SeatCategories => Set<SeatCategory>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<ShowFormat> ShowFormats => Set<ShowFormat>();
    public DbSet<Showtime> Showtimes => Set<Showtime>();
    public DbSet<ShowtimePricing> ShowtimePricings => Set<ShowtimePricing>();
    public DbSet<ShowtimeSeat> ShowtimeSeats => Set<ShowtimeSeat>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingItem> BookingItems => Set<BookingItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // MovieGenre composite key
        modelBuilder.Entity<MovieGenre>()
            .HasKey(mg => new { mg.MovieId, mg.GenreId });

        modelBuilder.Entity<MovieGenre>()
            .HasOne(mg => mg.Movie)
            .WithMany(m => m.Genres)
            .HasForeignKey(mg => mg.MovieId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MovieGenre>()
            .HasOne(mg => mg.Genre)
            .WithMany(g => g.Movies)
            .HasForeignKey(mg => mg.GenreId)
            .OnDelete(DeleteBehavior.Cascade);

        // MovieLanguage composite key
        modelBuilder.Entity<MovieLanguage>()
            .HasKey(ml => new { ml.MovieId, ml.LanguageId });

        modelBuilder.Entity<MovieLanguage>()
            .HasOne(ml => ml.Movie)
            .WithMany(m => m.Languages)
            .HasForeignKey(ml => ml.MovieId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MovieLanguage>()
            .HasOne(ml => ml.Language)
            .WithMany(l => l.Movies)
            .HasForeignKey(ml => ml.LanguageId)
            .OnDelete(DeleteBehavior.Cascade);

        // Decimal precision
        modelBuilder.Entity<MovieRating>()
            .Property(r => r.Rating)
            .HasPrecision(3, 1);

        modelBuilder.Entity<Movie>()
            .Property(m => m.AverageRating)
            .HasPrecision(4, 2);

        modelBuilder.Entity<TheaterRating>()
            .Property(r => r.Rating)
            .HasPrecision(3, 1);

        modelBuilder.Entity<SeatCategory>()
            .Property(c => c.DefaultPrice)
            .HasPrecision(10, 2);

        modelBuilder.Entity<ShowtimePricing>()
            .Property(p => p.Price)
            .HasPrecision(10, 2);

        // RefreshToken -> User (no cascade to avoid multiple cascade paths)
        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // MovieRating -> User (restrict to avoid cascade cycles)
        modelBuilder.Entity<MovieRating>()
            .HasOne(r => r.User)
            .WithMany(u => u.MovieRatings)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MovieRating>()
            .HasOne(r => r.Movie)
            .WithMany(m => m.Ratings)
            .HasForeignKey(r => r.MovieId)
            .OnDelete(DeleteBehavior.Cascade);

        // MovieReview -> User
        modelBuilder.Entity<MovieReview>()
            .HasOne(r => r.User)
            .WithMany(u => u.MovieReviews)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MovieReview>()
            .HasOne(r => r.Movie)
            .WithMany(m => m.Reviews)
            .HasForeignKey(r => r.MovieId)
            .OnDelete(DeleteBehavior.Cascade);

        // TheaterRating -> User
        modelBuilder.Entity<TheaterRating>()
            .HasOne(r => r.User)
            .WithMany(u => u.TheaterRatings)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TheaterRating>()
            .HasOne(r => r.Theater)
            .WithMany(t => t.Ratings)
            .HasForeignKey(r => r.TheaterId)
            .OnDelete(DeleteBehavior.Cascade);

        // Showtime -> Language (restrict to avoid multiple cascade paths)
        modelBuilder.Entity<Showtime>()
            .HasOne(s => s.Language)
            .WithMany(l => l.Showtimes)
            .HasForeignKey(s => s.LanguageId)
            .OnDelete(DeleteBehavior.Restrict);

        // ShowtimeSeat
        modelBuilder.Entity<ShowtimeSeat>()
            .HasOne(ss => ss.Showtime)
            .WithMany(s => s.ShowtimeSeats)
            .HasForeignKey(ss => ss.ShowtimeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ShowtimeSeat>()
            .HasOne(ss => ss.Seat)
            .WithMany(s => s.ShowtimeSeats)
            .HasForeignKey(ss => ss.SeatId)
            .OnDelete(DeleteBehavior.Restrict);

        // Speeds up seat-availability lookups and the lock-cleanup background service,
        // both of which filter on (ShowtimeId, Status).
        modelBuilder.Entity<ShowtimeSeat>()
            .HasIndex(ss => new { ss.ShowtimeId, ss.Status });

        // Optimistic concurrency tokens — see RowVersion doc comments on the entities.
        modelBuilder.Entity<ShowtimeSeat>()
            .Property(ss => ss.RowVersion)
            .IsRowVersion();

        modelBuilder.Entity<Booking>()
            .Property(b => b.RowVersion)
            .IsRowVersion();

        // Showtime status stored as string
        modelBuilder.Entity<Showtime>()
            .Property(s => s.Status)
            .HasConversion<string>();

        modelBuilder.Entity<ShowtimeSeat>()
            .Property(ss => ss.Status)
            .HasConversion<string>();

        modelBuilder.Entity<MoviePoster>()
            .Property(p => p.PosterType)
            .HasConversion<string>();

        // Indexes
        modelBuilder.Entity<Showtime>()
            .HasIndex(s => s.StartTime);

        modelBuilder.Entity<Seat>()
            .HasIndex(s => new { s.ScreenId, s.SeatNumber })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Booking
        modelBuilder.Entity<Booking>()
            .HasOne(b => b.User)
            .WithMany(u => u.Bookings)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Showtime)
            .WithMany()
            .HasForeignKey(b => b.ShowtimeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasIndex(b => b.BookingReference)
            .IsUnique();

        modelBuilder.Entity<Booking>()
            .Property(b => b.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Booking>()
            .Property(b => b.TotalAmount)
            .HasPrecision(10, 2);

        // BookingItem
        modelBuilder.Entity<BookingItem>()
            .HasOne(bi => bi.Booking)
            .WithMany(b => b.BookingItems)
            .HasForeignKey(bi => bi.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BookingItem>()
            .HasOne(bi => bi.ShowtimeSeat)
            .WithMany(ss => ss.BookingItems)
            .HasForeignKey(bi => bi.ShowtimeSeatId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BookingItem>()
            .Property(bi => bi.Price)
            .HasPrecision(10, 2);

        // Payment
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Booking)
            .WithOne(b => b.Payment)
            .HasForeignKey<Payment>(p => p.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Payment>()
            .Property(p => p.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount)
            .HasPrecision(10, 2);

        // Ticket
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Booking)
            .WithMany(b => b.Tickets)
            .HasForeignKey(t => t.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.BookingItem)
            .WithOne(bi => bi.Ticket)
            .HasForeignKey<Ticket>(t => t.BookingItemId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Ticket>()
            .HasIndex(t => t.TicketNumber)
            .IsUnique();

        // Notification
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.IsRead });
    }
}
