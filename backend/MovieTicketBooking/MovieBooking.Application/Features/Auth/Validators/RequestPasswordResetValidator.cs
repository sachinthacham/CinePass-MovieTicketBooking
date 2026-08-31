using FluentValidation;
using MovieBooking.Application.Features.Auth.Commands;

namespace MovieBooking.Application.Features.Auth.Validators;

public class RequestPasswordResetValidator : AbstractValidator<RequestPasswordResetCommand>
{
    public RequestPasswordResetValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
