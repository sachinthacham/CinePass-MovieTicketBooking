using MediatR;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Application.Features.Auth.Handlers;

public class ChangePasswordHandler : IRequestHandler<ChangePasswordCommand, bool>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public ChangePasswordHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId)
            ?? throw new EntityNotFoundException(nameof(User), request.UserId);

        if (string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ForbiddenOperationException("Current password is incorrect.");

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        return true;
    }
}
