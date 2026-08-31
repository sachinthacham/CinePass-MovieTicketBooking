using FluentValidation;
using MovieBooking.Application.Features.Bookings.Commands;

namespace MovieBooking.Application.Features.Bookings.Validators;

public class CreateBookingValidator : AbstractValidator<CreateBookingCommand>
{
    private const int MaxSeatsPerBooking = 10;

    public CreateBookingValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.ShowtimeId).NotEmpty();

        RuleFor(x => x.SeatIds)
            .NotEmpty().WithMessage("At least one seat must be selected.")
            .Must(ids => ids.Count <= MaxSeatsPerBooking).WithMessage($"A single booking cannot exceed {MaxSeatsPerBooking} seats.")
            .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Duplicate seat IDs are not allowed.");

        RuleFor(x => x.SessionId).NotEmpty();
    }
}
