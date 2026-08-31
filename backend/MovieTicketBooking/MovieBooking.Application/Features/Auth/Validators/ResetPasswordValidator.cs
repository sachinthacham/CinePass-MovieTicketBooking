using FluentValidation;
using MovieBooking.Application.Features.Auth.Commands;

namespace MovieBooking.Application.Features.Auth.Validators;

public class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();

        RuleFor(x => x.Token).NotEmpty();

        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(6);
    }
}
