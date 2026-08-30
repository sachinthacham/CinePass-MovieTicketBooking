namespace MovieBooking.Domain.Exceptions;

public class InvalidBookingStateException : DomainException
{
    public InvalidBookingStateException(string message) : base(message)
    {
    }
}
