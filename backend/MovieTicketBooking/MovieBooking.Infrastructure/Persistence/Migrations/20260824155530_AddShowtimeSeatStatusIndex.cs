using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieBooking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShowtimeSeatStatusIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShowtimeSeats_ShowtimeId",
                table: "ShowtimeSeats");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ShowtimeSeats",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_ShowtimeSeats_ShowtimeId_Status",
                table: "ShowtimeSeats",
                columns: new[] { "ShowtimeId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShowtimeSeats_ShowtimeId_Status",
                table: "ShowtimeSeats");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ShowtimeSeats",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_ShowtimeSeats_ShowtimeId",
                table: "ShowtimeSeats",
                column: "ShowtimeId");
        }
    }
}
