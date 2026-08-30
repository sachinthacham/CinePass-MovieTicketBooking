using MediatR;
using MovieBooking.Application.Interfaces;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.DTOs.Auth;
using MovieBooking.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace MovieBooking.Application.Features.Auth.Handlers;

public class LoginUserHandler : IRequestHandler<LoginUserCommand, AuthResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ILogger<LoginUserHandler> _logger;

    public LoginUserHandler(
        IUserRepository userRepository,
        IJwtService jwtService,
        IPasswordHasher passwordHasher,
        IRefreshTokenRepository refreshTokenRepository,
        ILogger<LoginUserHandler> logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _passwordHasher = passwordHasher;
        _refreshTokenRepository = refreshTokenRepository;
        _logger = logger;
    }

    public async Task<AuthResponseDto> Handle(LoginUserCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Login attempt for {Email}", request.Email);

        var user = await _userRepository.GetByEmailAsync(request.Email);

        if (user == null)
        {
            _logger.LogWarning("Login failed. User not found for {Email}", request.Email);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        if (string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Invalid password attempt for {Email}", request.Email);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        _logger.LogInformation("User {Email} authenticated successfully", request.Email);

        var accessToken = _jwtService.GenerateToken(user.Id, user.Email, user.Role);

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = _jwtService.GenerateRefreshToken(),
            ExpiryDate = DateTime.UtcNow.AddDays(7)
        };

        await _refreshTokenRepository.AddAsync(refreshToken);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token
        };
    }
}
