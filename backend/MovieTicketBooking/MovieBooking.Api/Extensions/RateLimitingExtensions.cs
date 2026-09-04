using Microsoft.AspNetCore.RateLimiting;

namespace MovieBooking.Api.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddCustomRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
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

        return services;
    }
}
