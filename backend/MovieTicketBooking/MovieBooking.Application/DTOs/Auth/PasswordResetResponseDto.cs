namespace MovieBooking.Application.DTOs.Auth;

public class PasswordResetResponseDto
{
    public string Message { get; set; } = "If an account with that email exists, a password reset link has been sent.";
}
