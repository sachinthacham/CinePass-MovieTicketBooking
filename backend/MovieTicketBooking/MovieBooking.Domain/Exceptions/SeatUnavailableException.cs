namespace MovieBooking.Domain.Exceptions;

public class SeatUnavailableException : DomainException
{
    public SeatUnavailableException(string message) : base(message)
    {
    }
}
