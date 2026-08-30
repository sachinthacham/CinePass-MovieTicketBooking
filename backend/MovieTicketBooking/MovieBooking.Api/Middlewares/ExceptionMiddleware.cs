using System.Net;
using System.Text.Json;
using FluentValidation;
using MovieBooking.Application.Common.Responses;
using MovieBooking.Domain.Exceptions;

namespace MovieBooking.Api.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message} at {Path}", ex.Message, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        ApiResponse<string> response;

        switch (exception)
        {
            case ValidationException validationException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response = ApiResponse<string>.FailureResponse(
                    "Validation failed",
                    validationException.Errors.Select(e => e.ErrorMessage).ToList());
                break;

            case EntityNotFoundException:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            case ForbiddenOperationException:
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            case SeatUnavailableException:
            case InvalidBookingStateException:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            case UnauthorizedAccessException:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            case KeyNotFoundException:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            case InvalidOperationException:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            case ArgumentException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response = ApiResponse<string>.FailureResponse(exception.Message);
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response = ApiResponse<string>.FailureResponse("An unexpected error occurred.");
                break;
        }

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }
}
