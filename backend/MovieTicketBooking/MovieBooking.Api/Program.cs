using Microsoft.EntityFrameworkCore;
using MovieBooking.Application.Interfaces;
using MovieBooking.Infrastructure.Data;
using MovieBooking.Infrastructure.Repositories;
using MovieBooking.Application.Features.Auth.Commands;
using MediatR;
using MovieBooking.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FluentValidation;
using MovieBooking.Application.Behaviors;
using MovieBooking.Api.Middlewares;
using Serilog;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text.Json.Serialization;
using MovieBooking.Infrastructure.BackgroundServices;
using MovieBooking.Api.Hubs;
using MovieBooking.Api.Services;
using Microsoft.AspNetCore.RateLimiting;

LoadDotEnv();
var builder = WebApplication.CreateBuilder(args);

static void LoadDotEnv()
{
    var candidates = new[]
    {
        Path.Combine(Directory.GetCurrentDirectory(), ".env"),
        Path.Combine(Directory.GetCurrentDirectory(), "..", ".env")
    };

    var envPath = candidates.FirstOrDefault(File.Exists);
    if (envPath is null) return;

    foreach (var rawLine in File.ReadAllLines(envPath))
    {
        var line = rawLine.Trim();
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) continue;

        var idx = line.IndexOf('=');
        if (idx <= 0) continue;

        var key = line[..idx].Trim();
        var value = line[(idx + 1)..].Trim().Trim('"');
        Environment.SetEnvironmentVariable(key, value);
    }
}

// ─── Serilog ─────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .WriteTo.Console()
    .WriteTo.File("logs/moviebooking-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30)
    .CreateLogger();

builder.Host.UseSerilog();

// ─── API Versioning ───────────────────────────────────────────────────────────
builder.Services.AddApiVersioning(options =>
{
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.ReportApiVersions = true;
});

builder.Services.AddVersionedApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// ─── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── MediatR ─────────────────────────────────────────────────────────────────
builder.Services.AddMediatR(typeof(RegisterUserCommand));

// ─── Repositories ─────────────────────────────────────────────────────────────
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IMovieRepository, MovieRepository>();
builder.Services.AddScoped<IGenreRepository, GenreRepository>();
builder.Services.AddScoped<ILanguageRepository, LanguageRepository>();
builder.Services.AddScoped<IMovieRatingRepository, MovieRatingRepository>();
builder.Services.AddScoped<IMovieReviewRepository, MovieReviewRepository>();
builder.Services.AddScoped<IMovieTrailerRepository, MovieTrailerRepository>();
builder.Services.AddScoped<IMoviePosterRepository, MoviePosterRepository>();
builder.Services.AddScoped<ITheaterRepository, TheaterRepository>();
builder.Services.AddScoped<ITheaterFacilityRepository, TheaterFacilityRepository>();
builder.Services.AddScoped<ITheaterImageRepository, TheaterImageRepository>();
builder.Services.AddScoped<ITheaterRatingRepository, TheaterRatingRepository>();
builder.Services.AddScoped<IScreenRepository, ScreenRepository>();
builder.Services.AddScoped<ISeatCategoryRepository, SeatCategoryRepository>();
builder.Services.AddScoped<ISeatRepository, SeatRepository>();
builder.Services.AddScoped<IShowFormatRepository, ShowFormatRepository>();
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<IShowtimeSeatRepository, ShowtimeSeatRepository>();
builder.Services.AddScoped<IShowtimePricingRepository, ShowtimePricingRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingItemRepository, BookingItemRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IUnitOfWork, MovieBooking.Infrastructure.Data.UnitOfWork>();

// ─── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IPaymentService, StripePaymentService>();
builder.Services.AddScoped<IQrCodeService, QrCodeService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ISeatAvailabilityNotifier, SignalRSeatAvailabilityNotifier>();
builder.Services.AddSingleton<IBookingSettings, BookingSettings>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSignalR();
builder.Services.AddHostedService<SeatLockCleanupService>();

// ─── FluentValidation + MediatR Pipeline ─────────────────────────────────────
builder.Services.AddValidatorsFromAssembly(typeof(RegisterUserCommand).Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// ─── Controllers ─────────────────────────────────────────────────────────────
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Return enum names (e.g. "Pending") instead of numeric values (e.g. 0)
        // so frontend status fields render correctly.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

// ─── Swagger with JWT ─────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Movie Ticket Booking API",
        Version = "v1",
        Description = "Enterprise-level Movie Ticket Booking System REST API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ─── JWT Authentication ───────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is not configured.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MovieBookingApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "MovieBookingClient";

var key = Encoding.UTF8.GetBytes(jwtKey);

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero,
        NameClaimType = ClaimTypes.NameIdentifier
    };
});

// Only add social auth providers when credentials are configured
var googleClientId = builder.Configuration["SocialAuth:Google:ClientId"];
var googleClientSecret = builder.Configuration["SocialAuth:Google:ClientSecret"];
var facebookAppId = builder.Configuration["SocialAuth:Facebook:AppId"];
var facebookAppSecret = builder.Configuration["SocialAuth:Facebook:AppSecret"];
var appleClientId = builder.Configuration["SocialAuth:Apple:ClientId"];

var authBuilder2 = authBuilder;

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authBuilder2 = authBuilder2.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.CallbackPath = "/api/v1/auth/callback/google";

        options.Events.OnCreatingTicket = async context =>
        {
            var userRepo = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
            var jwtService = context.HttpContext.RequestServices.GetRequiredService<IJwtService>();
            var refreshTokenRepo = context.HttpContext.RequestServices.GetRequiredService<IRefreshTokenRepository>();

            var socialId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var email = context.Principal?.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
            var name = context.Principal?.FindFirstValue(ClaimTypes.Name) ?? string.Empty;

            var user = await userRepo.GetBySocialIdAsync("Google", socialId)
                       ?? await userRepo.GetByEmailAsync(email);

            if (user == null)
            {
                user = new MovieBooking.Domain.Entities.User
                {
                    FullName = name,
                    Email = email,
                    SocialProvider = "Google",
                    SocialId = socialId,
                    Role = "User"
                };
                await userRepo.AddAsync(user);
            }
            else if (string.IsNullOrEmpty(user.SocialId))
            {
                user.SocialProvider = "Google";
                user.SocialId = socialId;
                await userRepo.UpdateAsync(user);
            }

            var accessToken = jwtService.GenerateToken(user.Id, user.Email, user.Role);
            var refreshTokenValue = jwtService.GenerateRefreshToken();

            await refreshTokenRepo.AddAsync(new MovieBooking.Domain.Entities.RefreshToken
            {
                UserId = user.Id,
                Token = refreshTokenValue,
                ExpiryDate = DateTime.UtcNow.AddDays(7)
            });

            var frontendUrl = builder.Configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
            context.Response.Redirect($"{frontendUrl}/auth/callback?accessToken={accessToken}&refreshToken={refreshTokenValue}");
        };
    });
}

if (!string.IsNullOrWhiteSpace(facebookAppId) && !string.IsNullOrWhiteSpace(facebookAppSecret))
{
    authBuilder2 = authBuilder2.AddFacebook(options =>
    {
        options.AppId = facebookAppId;
        options.AppSecret = facebookAppSecret;
        options.CallbackPath = "/api/v1/auth/callback/facebook";
    });
}

if (!string.IsNullOrWhiteSpace(appleClientId))
{
    authBuilder2.AddApple(options =>
    {
        options.ClientId = appleClientId;
        options.KeyId = builder.Configuration["SocialAuth:Apple:KeyId"] ?? string.Empty;
        options.TeamId = builder.Configuration["SocialAuth:Apple:TeamId"] ?? string.Empty;
        options.PrivateKey = (keyId, _) =>
        {
            var pk = builder.Configuration["SocialAuth:Apple:PrivateKey"] ?? string.Empty;
            return Task.FromResult(pk.AsMemory());
        };
        options.CallbackPath = "/api/v1/auth/callback/apple";
    });
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// "Frontend:AllowedOrigins" is a comma-separated list for production domains
// (e.g. "https://app.example.com,https://admin.example.com"); the localhost
// entries stay so local dev keeps working out of the box.
var additionalOrigins = (builder.Configuration["Frontend:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

var corsOrigins = new[] { builder.Configuration["Frontend:BaseUrl"] ?? "http://localhost:3000" }
    .Concat(additionalOrigins)
    .Concat(["http://localhost:3000", "http://localhost:3001"])
    .Distinct()
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Login/register/password-reset/refresh — brute-force and credential-stuffing surface.
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueLimit = 0;
    });

    // Seat lock/unlock — was previously anonymous and unthrottled; caps griefing/DoS potential.
    options.AddFixedWindowLimiter("seat-lock", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 30;
        opt.QueueLimit = 0;
    });
});

var app = builder.Build();

// ─── Auto-migrate & Seed ──────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
    await DataSeeder.SeedAsync(dbContext);
}

Log.Information("MovieBooking API starting up...");

// ─── Middleware pipeline ──────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Movie Ticket Booking API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseStaticFiles();
app.UseCors("Frontend");
app.UseMiddleware<ExceptionMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SeatAvailabilityHub>("/hubs/seat-availability");
app.Run();
