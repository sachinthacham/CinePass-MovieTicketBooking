namespace MovieBooking.Api.Extensions;

public static class CorsExtensions
{
    public const string PolicyName = "Frontend";

    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        // "Frontend:AllowedOrigins" is a comma-separated list for production domains
        // (e.g. "https://app.example.com,https://admin.example.com"); the localhost
        // entries stay so local dev keeps working out of the box.
        var additionalOrigins = (configuration["Frontend:AllowedOrigins"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var corsOrigins = new[] { configuration["Frontend:BaseUrl"] ?? "http://localhost:3000" }
            .Concat(additionalOrigins)
            .Concat(["http://localhost:3000", "http://localhost:3001"])
            .Distinct()
            .ToArray();

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
            {
                policy.WithOrigins(corsOrigins)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        return services;
    }
}
