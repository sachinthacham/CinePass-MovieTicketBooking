using FluentValidation;
using MovieBooking.Application.Features.Bookings.Commands;

namespace MovieBooking.Application.Features.Bookings.Validators;

public class CancelBookingValidator : AbstractValidator<CancelBookingCommand>
{
    public CancelBookingValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty();
        RuleFor(x => x.RequestingUserId).NotEmpty();
        RuleFor(x => x.RequestingUserRole).NotEmpty();
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}
