using Microsoft.EntityFrameworkCore;
using MovieBooking.Api.Hubs;
using MovieBooking.Api.Middlewares;
using MovieBooking.Infrastructure.Data;

namespace MovieBooking.Api.Extensions;

public static class StartupExtensions
{
    public static async Task ApplyMigrationsAndSeedAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        dbContext.Database.Migrate();
        await DataSeeder.SeedAsync(dbContext);
    }

    public static void UseRequestPipeline(this WebApplication app)
    {
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
        app.UseCors(CorsExtensions.PolicyName);
        app.UseMiddleware<ExceptionMiddleware>();
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        app.MapHub<SeatAvailabilityHub>("/hubs/seat-availability");
    }
}
