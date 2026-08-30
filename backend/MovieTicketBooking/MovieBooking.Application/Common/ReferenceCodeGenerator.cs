using System.Security.Cryptography;

namespace MovieBooking.Application.Common;

public static class ReferenceCodeGenerator
{
    private const string Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public static string GenerateBookingReference() => GenerateCode(8);

    public static string GenerateTicketNumber() => $"TKT-{GenerateCode(4)}-{GenerateCode(4)}";

    private static string GenerateCode(int length)
    {
        Span<char> buffer = stackalloc char[length];
        for (var i = 0; i < length; i++)
            buffer[i] = Chars[RandomNumberGenerator.GetInt32(Chars.Length)];

        return new string(buffer);
    }
}
