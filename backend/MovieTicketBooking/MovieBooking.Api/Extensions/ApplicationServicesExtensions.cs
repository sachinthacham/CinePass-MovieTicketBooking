using FluentValidation;
using MediatR;
using MovieBooking.Api.Services;
using MovieBooking.Application.Behaviors;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Infrastructure.BackgroundServices;
using MovieBooking.Infrastructure.Services;

namespace MovieBooking.Api.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(typeof(RegisterUserCommand));
        services.AddValidatorsFromAssembly(typeof(RegisterUserCommand).Assembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IEmailService, SmtpEmailService>();
        services.AddScoped<IPaymentService, StripePaymentService>();
        services.AddScoped<IQrCodeService, QrCodeService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ISeatAvailabilityNotifier, SignalRSeatAvailabilityNotifier>();
        services.AddSingleton<IBookingSettings, BookingSettings>();

        services.AddHttpContextAccessor();
        services.AddSignalR();
        services.AddHostedService<SeatLockCleanupService>();

        return services;
    }
}
