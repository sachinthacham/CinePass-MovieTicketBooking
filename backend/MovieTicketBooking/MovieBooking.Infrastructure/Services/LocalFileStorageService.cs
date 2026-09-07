using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MovieBooking.Application.Interfaces;

namespace MovieBooking.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly IHostEnvironment _env;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IHostEnvironment env,
        IHttpContextAccessor httpContextAccessor,
        ILogger<LocalFileStorageService> logger)
    {
        _env = env;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<string> UploadAsync(IFormFile file, string folder)
    {
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLower();

        if (!allowedExtensions.Contains(extension))
            throw new InvalidOperationException($"File type '{extension}' is not allowed.");

        if (file.Length > 10 * 1024 * 1024)
            throw new InvalidOperationException("File size exceeds the 10MB limit.");

        var webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadsPath = Path.Combine(webRoot, "uploads", folder);
        Directory.CreateDirectory(uploadsPath);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var request = _httpContextAccessor.HttpContext?.Request;
        var baseUrl = request != null
            ? $"{request.Scheme}://{request.Host}"
            : string.Empty;

        return $"{baseUrl}/uploads/{folder}/{fileName}";
    }

    public Task DeleteAsync(string fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl)) return Task.CompletedTask;

        try
        {
            var uri = new Uri(fileUrl);
            var relativePath = uri.AbsolutePath.TrimStart('/');
            var webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
            var fullPath = Path.Combine(webRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));

            if (File.Exists(fullPath))
                File.Delete(fullPath);
        }
        catch (Exception ex)
        {
            // Best-effort cleanup — an orphaned file on disk isn't worth failing the
            // caller's request over, but it must be visible in logs, not silent.
            _logger.LogWarning(ex, "Failed to delete file for URL {FileUrl}", fileUrl);
        }

        return Task.CompletedTask;
    }
}
