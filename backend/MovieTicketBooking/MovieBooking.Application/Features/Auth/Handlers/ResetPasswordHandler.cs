using MediatR;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Application.Features.Auth.Handlers;

public class ResetPasswordHandler : IRequestHandler<ResetPasswordCommand, bool>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public ResetPasswordHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);

        if (user == null
            || user.PasswordResetToken != request.Token
            || user.PasswordResetTokenExpiry == null
            || user.PasswordResetTokenExpiry < DateTime.UtcNow)
        {
            throw new ForbiddenOperationException("Invalid or expired password reset token.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        return true;
    }
}
