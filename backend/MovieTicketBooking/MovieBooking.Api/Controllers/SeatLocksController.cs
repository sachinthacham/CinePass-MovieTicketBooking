using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MovieBooking.Application.Common.Responses;
using MovieBooking.Application.Features.SeatLocks.Commands;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/seat-locks")]
[ApiVersion("1.0")]
[Authorize]
[EnableRateLimiting("seat-lock")]
public class SeatLocksController : ControllerBase
{
    private readonly IMediator _mediator;

    public SeatLocksController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> Lock([FromBody] SeatLockRequestDto dto)
    {
        var result = await _mediator.Send(new LockSeatsCommand(dto.ShowtimeId, dto.SeatIds, dto.SessionId));
        return Ok(ApiResponse<bool>.SuccessResponse(result, "Seats locked for 10 minutes."));
    }

    [HttpPost("unlock")]
    public async Task<IActionResult> Unlock([FromBody] SeatLockRequestDto dto)
    {
        var result = await _mediator.Send(new UnlockSeatsCommand(dto.ShowtimeId, dto.SeatIds, dto.SessionId));
        return Ok(ApiResponse<bool>.SuccessResponse(result, "Seats unlocked."));
    }
}

public class SeatLockRequestDto
{
    public Guid ShowtimeId { get; set; }
    public List<Guid> SeatIds { get; set; } = [];
    public string SessionId { get; set; } = default!;
}
