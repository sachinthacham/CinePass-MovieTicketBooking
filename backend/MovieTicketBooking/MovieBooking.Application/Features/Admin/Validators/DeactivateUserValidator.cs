using FluentValidation;
using MovieBooking.Application.Features.Admin.Commands;

namespace MovieBooking.Application.Features.Admin.Validators;

public class DeactivateUserValidator : AbstractValidator<DeactivateUserCommand>
{
    public DeactivateUserValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public class ActivateUserValidator : AbstractValidator<ActivateUserCommand>
{
    public ActivateUserValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}
