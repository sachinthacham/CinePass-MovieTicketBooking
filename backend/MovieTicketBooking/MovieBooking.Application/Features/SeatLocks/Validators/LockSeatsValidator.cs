using FluentValidation;
using MovieBooking.Application.Features.SeatLocks.Commands;

namespace MovieBooking.Application.Features.SeatLocks.Validators;

public class LockSeatsValidator : AbstractValidator<LockSeatsCommand>
{
    private const int MaxSeatsPerLock = 10;

    public LockSeatsValidator()
    {
        RuleFor(x => x.ShowtimeId).NotEmpty();

        RuleFor(x => x.SeatIds)
            .NotEmpty().WithMessage("At least one seat must be selected.")
            .Must(ids => ids.Count <= MaxSeatsPerLock).WithMessage($"A single lock request cannot exceed {MaxSeatsPerLock} seats.")
            .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Duplicate seat IDs are not allowed.");

        RuleFor(x => x.SessionId).NotEmpty();
    }
}
