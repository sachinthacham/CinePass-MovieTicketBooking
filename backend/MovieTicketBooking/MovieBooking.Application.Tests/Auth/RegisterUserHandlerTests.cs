using Moq;
using MovieBooking.Application.Features.Auth.Commands;
using MovieBooking.Application.Features.Auth.Handlers;
using MovieBooking.Application.Interfaces;
using MovieBooking.Domain.Entities;

namespace MovieBooking.Application.Tests.Auth;

public class RegisterUserHandlerTests
{
    [Fact]
    public async Task Handle_ShouldThrow_WhenEmailAlreadyExists()
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(x => x.GetByEmailAsync("admin@movietick.com"))
            .ReturnsAsync(new User { Email = "admin@movietick.com" });

        var passwordHasher = new Mock<IPasswordHasher>();

        var handler = new RegisterUserHandler(userRepository.Object, passwordHasher.Object);
        var command = new RegisterUserCommand("Admin User", "admin@movietick.com", "Admin@123456");

        var act = () => handler.Handle(command, CancellationToken.None);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(act);
        Assert.Equal("An account with this email already exists.", exception.Message);
        userRepository.Verify(x => x.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ShouldCreateUserAndHashPassword_WhenEmailIsNew()
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(x => x.GetByEmailAsync("new.user@movietick.com"))
            .ReturnsAsync((User?)null);

        User? savedUser = null;
        userRepository
            .Setup(x => x.AddAsync(It.IsAny<User>()))
            .Callback<User>(user => savedUser = user)
            .Returns(Task.CompletedTask);

        var passwordHasher = new Mock<IPasswordHasher>();
        passwordHasher
            .Setup(x => x.Hash("User@123456"))
            .Returns("hashed:User@123456");

        var handler = new RegisterUserHandler(userRepository.Object, passwordHasher.Object);
        var command = new RegisterUserCommand("New User", "new.user@movietick.com", "User@123456");

        var userId = await handler.Handle(command, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, userId);
        Assert.NotNull(savedUser);
        Assert.Equal("New User", savedUser!.FullName);
        Assert.Equal("new.user@movietick.com", savedUser.Email);
        Assert.Equal("hashed:User@123456", savedUser.PasswordHash);
        passwordHasher.Verify(x => x.Hash("User@123456"), Times.Once);
        userRepository.Verify(x => x.AddAsync(It.IsAny<User>()), Times.Once);
    }
}
