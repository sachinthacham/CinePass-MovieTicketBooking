using FluentValidation;
using MovieBooking.Application.Features.Admin.Commands;

namespace MovieBooking.Application.Features.Admin.Validators;

public class UpdateUserRoleValidator : AbstractValidator<UpdateUserRoleCommand>
{
    private static readonly string[] AllowedRoles = ["User", "Admin"];

    public UpdateUserRoleValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();

        RuleFor(x => x.NewRole)
            .NotEmpty()
            .Must(role => AllowedRoles.Contains(role))
            .WithMessage($"Role must be one of: {string.Join(", ", AllowedRoles)}.");
    }
}
