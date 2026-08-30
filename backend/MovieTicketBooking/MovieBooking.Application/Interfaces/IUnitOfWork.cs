namespace MovieBooking.Application.Interfaces;

public interface IUnitOfWork
{
    /// <summary>
    /// Runs the given operation inside a single database transaction, committing on
    /// success and rolling back if it throws. Use this whenever a handler writes
    /// through more than one repository and those writes need to succeed or fail
    /// together (e.g. creating a booking + its items + its payment record).
    /// </summary>
    Task ExecuteInTransactionAsync(Func<Task> operation, CancellationToken cancellationToken = default);
}
