using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Application.Common.Responses;
using MovieBooking.Application.DTOs.Bookings;
using MovieBooking.Application.Features.Bookings.Commands;
using MovieBooking.Application.Features.Bookings.Queries;
using MovieBooking.Domain.Enums;
using System.Security.Claims;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/bookings")]
[ApiVersion("1.0")]
public class BookingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public BookingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequestDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _mediator.Send(new CreateBookingCommand(userId, dto.ShowtimeId, dto.SeatIds, dto.SessionId));
        return CreatedAtAction(nameof(GetById), new { id = result.BookingId, version = "1.0" },
            ApiResponse<CreateBookingResultDto>.SuccessResponse(result, "Booking created. Complete payment to confirm."));
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "User";
        var result = await _mediator.Send(new GetBookingByIdQuery(id, userId, role));
        return Ok(ApiResponse<BookingDto>.SuccessResponse(result));
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyBookings(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] BookingStatus? status = null)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _mediator.Send(new GetUserBookingsQuery(userId, page, pageSize, status));
        return Ok(ApiResponse<PagedBookingsDto>.SuccessResponse(result));
    }

    [Authorize]
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelBookingRequestDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "User";
        var result = await _mediator.Send(new CancelBookingCommand(id, userId, role, dto.Reason));
        return Ok(ApiResponse<bool>.SuccessResponse(result, "Booking cancelled."));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] BookingStatus? status = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null)
    {
        var result = await _mediator.Send(new GetAllBookingsQuery(page, pageSize, status, userId, fromDate, toDate, search));
        return Ok(ApiResponse<PagedBookingsDto>.SuccessResponse(result));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/{id:guid}/cancel")]
    public async Task<IActionResult> AdminCancel(Guid id, [FromBody] CancelBookingRequestDto dto)
    {
        var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _mediator.Send(new CancelBookingCommand(id, adminId, "Admin", dto.Reason));
        return Ok(ApiResponse<bool>.SuccessResponse(result, "Booking cancelled by admin."));
    }
}

public class CreateBookingRequestDto
{
    public Guid ShowtimeId { get; set; }
    public List<Guid> SeatIds { get; set; } = [];
    public string SessionId { get; set; } = default!;
}

public class CancelBookingRequestDto
{
    public string? Reason { get; set; }
}
