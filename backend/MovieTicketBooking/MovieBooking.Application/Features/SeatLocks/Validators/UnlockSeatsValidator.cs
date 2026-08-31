using FluentValidation;
using MovieBooking.Application.Features.SeatLocks.Commands;

namespace MovieBooking.Application.Features.SeatLocks.Validators;

public class UnlockSeatsValidator : AbstractValidator<UnlockSeatsCommand>
{
    public UnlockSeatsValidator()
    {
        RuleFor(x => x.ShowtimeId).NotEmpty();
        RuleFor(x => x.SeatIds).NotEmpty().WithMessage("At least one seat must be specified.");
        RuleFor(x => x.SessionId).NotEmpty();
    }
}
