using Moq;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Features.Auth.Handlers;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;

namespace MovieBooking.Application.Tests.Auth;

public class PasswordHandlersTests
{
    [Fact]
    public async Task RequestPasswordReset_ShouldReturnGenericResponse_WithoutSendingEmail_WhenEmailDoesNotExist()
    {
        // Returning a generic "if this account exists" response either way (instead of
        // throwing) prevents an attacker from using this endpoint to enumerate registered
        // emails. See RequestPasswordResetHandler.
        var userRepository = new Mock<IUserRepository>();
        var emailService = new Mock<IEmailService>();
        userRepository
            .Setup(x => x.GetByEmailAsync("missing@movietick.com"))
            .ReturnsAsync((User?)null);

        var handler = new RequestPasswordResetHandler(userRepository.Object, emailService.Object);
        var result = await handler.Handle(new RequestPasswordResetCommand("missing@movietick.com"), CancellationToken.None);

        Assert.NotNull(result);
        userRepository.Verify(x => x.UpdateAsync(It.IsAny<User>()), Times.Never);
        emailService.Verify(x => x.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RequestPasswordReset_ShouldGenerateTokenAndEmailIt_WithoutExposingItInTheResponse_WhenEmailExists()
    {
        var userRepository = new Mock<IUserRepository>();
        var emailService = new Mock<IEmailService>();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@movietick.com"
        };

        userRepository
            .Setup(x => x.GetByEmailAsync(user.Email))
            .ReturnsAsync(user);
        userRepository
            .Setup(x => x.UpdateAsync(user))
            .Returns(Task.CompletedTask);

        string? sentToken = null;
        emailService
            .Setup(x => x.SendPasswordResetEmailAsync(user.Email, It.IsAny<string>()))
            .Callback<string, string>((_, token) => sentToken = token)
            .Returns(Task.CompletedTask);

        var handler = new RequestPasswordResetHandler(userRepository.Object, emailService.Object);
        var result = await handler.Handle(new RequestPasswordResetCommand(user.Email), CancellationToken.None);

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(sentToken));
        Assert.Equal(sentToken, user.PasswordResetToken);
        Assert.NotNull(user.PasswordResetTokenExpiry);
        Assert.True(user.PasswordResetTokenExpiry > DateTime.UtcNow);
        userRepository.Verify(x => x.UpdateAsync(user), Times.Once);
        emailService.Verify(x => x.SendPasswordResetEmailAsync(user.Email, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ChangePassword_ShouldThrow_WhenCurrentPasswordIsWrong()
    {
        var userRepository = new Mock<IUserRepository>();
        var passwordHasher = new Mock<IPasswordHasher>();
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "user@movietick.com",
            PasswordHash = "hashed:Correct@123"
        };

        userRepository
            .Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);
        passwordHasher
            .Setup(x => x.Verify("Wrong@123", user.PasswordHash))
            .Returns(false);

        var handler = new ChangePasswordHandler(userRepository.Object, passwordHasher.Object);
        var act = () => handler.Handle(new ChangePasswordCommand(userId, "Wrong@123", "New@123456"), CancellationToken.None);

        var exception = await Assert.ThrowsAsync<MovieBooking.Domain.Exceptions.ForbiddenOperationException>(act);
        Assert.Equal("Current password is incorrect.", exception.Message);
        userRepository.Verify(x => x.UpdateAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task ChangePassword_ShouldHashAndPersistNewPassword_WhenCurrentPasswordIsValid()
    {
        var userRepository = new Mock<IUserRepository>();
        var passwordHasher = new Mock<IPasswordHasher>();
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "user@movietick.com",
            PasswordHash = "hashed:Current@123"
        };

        userRepository
            .Setup(x => x.GetByIdAsync(userId))
            .ReturnsAsync(user);
        userRepository
            .Setup(x => x.UpdateAsync(user))
            .Returns(Task.CompletedTask);
        passwordHasher
            .Setup(x => x.Verify("Current@123", user.PasswordHash))
            .Returns(true);
        passwordHasher
            .Setup(x => x.Hash("NewStrong@123"))
            .Returns("hashed:NewStrong@123");

        var handler = new ChangePasswordHandler(userRepository.Object, passwordHasher.Object);
        var result = await handler.Handle(
            new ChangePasswordCommand(userId, "Current@123", "NewStrong@123"),
            CancellationToken.None);

        Assert.True(result);
        Assert.Equal("hashed:NewStrong@123", user.PasswordHash);
        userRepository.Verify(x => x.UpdateAsync(user), Times.Once);
    }
}
