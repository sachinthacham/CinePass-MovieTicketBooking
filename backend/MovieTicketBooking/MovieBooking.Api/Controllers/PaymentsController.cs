using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Application.Common.Responses;
using MovieBooking.Application.Features.Payments.Commands;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/payments")]
[ApiVersion("1.0")]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(IMediator mediator, ILogger<PaymentsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> StripeWebhook()
    {
        var payload = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();

        if (string.IsNullOrWhiteSpace(payload) || string.IsNullOrWhiteSpace(signature))
        {
            return BadRequest(ApiResponse<string>.FailureResponse("Invalid webhook payload or signature."));
        }

        try
        {
            var result = await _mediator.Send(new HandleStripeWebhookCommand(payload, signature));
            return Ok(new { received = result });
        }
        catch (Exception ex)
        {
            // Signature/parsing failures land here — log the real reason but never
            // echo webhook internals (e.g. Stripe signature-verification details) back
            // in the response body.
            _logger.LogWarning(ex, "Stripe webhook processing failed");
            return BadRequest(ApiResponse<string>.FailureResponse("Webhook processing failed."));
        }
    }
}
