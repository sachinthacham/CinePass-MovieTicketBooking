using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MovieBooking.Application.Common.Responses;
using MovieBooking.Application.DTOs.Auth;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Features.Auth.Queries;
using System.Security.Claims;

namespace MovieBooking.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IMediator mediator, ILogger<AuthController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto dto)
    {
        var command = new RegisterUserCommand(dto.FullName, dto.Email, dto.Password);
        var userId = await _mediator.Send(command);
        return Ok(ApiResponse<Guid>.SuccessResponse(userId, "Registration successful."));
    }

    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var command = new LoginUserCommand(dto.Email, dto.Password);
        var response = await _mediator.Send(command);
        _logger.LogInformation("Login attempt for {Email}", dto.Email);
        return Ok(ApiResponse<AuthResponseDto>.SuccessResponse(response, "Login successful."));
    }


    [EnableRateLimiting("auth")]
    [HttpPost("request-password-reset")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetDto dto)
    {
        var command = new RequestPasswordResetCommand(dto.Email);
        var response = await _mediator.Send(command);
        return Ok(ApiResponse<PasswordResetResponseDto>.SuccessResponse(response, response.Message));
    }

    
    [EnableRateLimiting("auth")]
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        var command = new RefreshTokenCommand(dto.RefreshToken);
        var response = await _mediator.Send(command);
        return Ok(ApiResponse<AuthResponseDto>.SuccessResponse(response, "Token refreshed."));
    }

    [EnableRateLimiting("auth")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var command = new ResetPasswordCommand(dto.Email, dto.Token, dto.NewPassword);
        await _mediator.Send(command);
        return Ok(ApiResponse<bool>.SuccessResponse(true, "Password reset successfully."));
    }

   

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        var profile = await _mediator.Send(new GetUserProfileQuery(userId));
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(profile));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = GetCurrentUserId();
        var command = new ChangePasswordCommand(userId, dto.CurrentPassword, dto.NewPassword);
        await _mediator.Send(command);
        return Ok(ApiResponse<bool>.SuccessResponse(true, "Password changed successfully."));
    }


    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userId = GetCurrentUserId();
        var command = new UpdateUserProfileCommand(userId, dto.FullName, dto.PhoneNumber, dto.Bio, dto.DateOfBirth, dto.Gender);
        var profile = await _mediator.Send(command);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(profile, "Profile updated."));
    }

    [Authorize]
    [HttpPost("profile/image")]
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        var userId = GetCurrentUserId();
        var command = new UploadProfileImageCommand(userId, file);
        var url = await _mediator.Send(command);
        return Ok(ApiResponse<string>.SuccessResponse(url, "Profile image uploaded."));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("me")]
    public IActionResult GetMe()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(ApiResponse<string>.SuccessResponse($"Authorized as Admin: {email}"));
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid token.");
        return userId;
    }
}
