using FluentValidation;
using MovieBooking.Application.Features.Auth.Commands;

namespace MovieBooking.Application.Features.Auth.Validators;

public class ChangePasswordValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();

        RuleFor(x => x.CurrentPassword).NotEmpty();

        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(6)
            .NotEqual(x => x.CurrentPassword).WithMessage("New password must be different from the current password.");
    }
}
