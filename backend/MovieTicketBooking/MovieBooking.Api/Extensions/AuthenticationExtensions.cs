using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;

namespace MovieBooking.Api.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddJwtAndSocialAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtKey = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key is not configured.");
        var jwtIssuer = configuration["Jwt:Issuer"] ?? "MovieBookingApi";
        var jwtAudience = configuration["Jwt:Audience"] ?? "MovieBookingClient";
        var key = Encoding.UTF8.GetBytes(jwtKey);

        var authBuilder = services.AddAuthentication(options =>
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
        var googleClientId = configuration["SocialAuth:Google:ClientId"];
        var googleClientSecret = configuration["SocialAuth:Google:ClientSecret"];
        var facebookAppId = configuration["SocialAuth:Facebook:AppId"];
        var facebookAppSecret = configuration["SocialAuth:Facebook:AppSecret"];
        var appleClientId = configuration["SocialAuth:Apple:ClientId"];

        if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
        {
            authBuilder = authBuilder.AddGoogle(options =>
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
                        user = new User
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

                    await refreshTokenRepo.AddAsync(new RefreshToken
                    {
                        UserId = user.Id,
                        Token = refreshTokenValue,
                        ExpiryDate = DateTime.UtcNow.AddDays(7)
                    });

                    var frontendUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
                    context.Response.Redirect($"{frontendUrl}/auth/callback?accessToken={accessToken}&refreshToken={refreshTokenValue}");
                };
            });
        }

        if (!string.IsNullOrWhiteSpace(facebookAppId) && !string.IsNullOrWhiteSpace(facebookAppSecret))
        {
            authBuilder = authBuilder.AddFacebook(options =>
            {
                options.AppId = facebookAppId;
                options.AppSecret = facebookAppSecret;
                options.CallbackPath = "/api/v1/auth/callback/facebook";
            });
        }

        if (!string.IsNullOrWhiteSpace(appleClientId))
        {
            authBuilder.AddApple(options =>
            {
                options.ClientId = appleClientId;
                options.KeyId = configuration["SocialAuth:Apple:KeyId"] ?? string.Empty;
                options.TeamId = configuration["SocialAuth:Apple:TeamId"] ?? string.Empty;
                options.PrivateKey = (keyId, _) =>
                {
                    var pk = configuration["SocialAuth:Apple:PrivateKey"] ?? string.Empty;
                    return Task.FromResult(pk.AsMemory());
                };
                options.CallbackPath = "/api/v1/auth/callback/apple";
            });
        }

        return services;
    }
}
