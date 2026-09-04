namespace MovieBooking.Api.Extensions;

public static class EnvironmentLoader
{
    public static void LoadDotEnv()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", ".env")
        };

        var envPath = candidates.FirstOrDefault(File.Exists);
        if (envPath is null) return;

        foreach (var rawLine in File.ReadAllLines(envPath))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) continue;

            var idx = line.IndexOf('=');
            if (idx <= 0) continue;

            var key = line[..idx].Trim();
            var value = line[(idx + 1)..].Trim().Trim('"');
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
