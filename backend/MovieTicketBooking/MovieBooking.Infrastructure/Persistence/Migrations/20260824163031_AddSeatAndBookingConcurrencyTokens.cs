using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieBooking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSeatAndBookingConcurrencyTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "ShowtimeSeats",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Bookings",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "ShowtimeSeats");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Bookings");
        }
    }
}
