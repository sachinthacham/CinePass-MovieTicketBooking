using MediatR;
using MovieBooking.Application.DTOs.Auth;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Interfaces;

namespace MovieBooking.Application.Features.Auth.Handlers;

public class RequestPasswordResetHandler : IRequestHandler<RequestPasswordResetCommand, PasswordResetResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public RequestPasswordResetHandler(IUserRepository userRepository, IEmailService emailService)
    {
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task<PasswordResetResponseDto> Handle(RequestPasswordResetCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);

        // Only generate/send a token if the account exists, but always return the
        // same generic response either way — revealing that would let an attacker
        // enumerate which emails have accounts.
        if (user != null)
        {
            var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");

            user.PasswordResetToken = token;
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            user.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user);
            await _emailService.SendPasswordResetEmailAsync(user.Email, token);
        }

        return new PasswordResetResponseDto();
    }
}
