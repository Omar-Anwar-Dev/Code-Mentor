using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIRTCalibrationLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IRTCalibrationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CalibratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResponseCountAtRun = table.Column<int>(type: "int", nullable: false),
                    IRT_A_Old = table.Column<double>(type: "float", nullable: false),
                    IRT_B_Old = table.Column<double>(type: "float", nullable: false),
                    IRT_A_New = table.Column<double>(type: "float", nullable: false),
                    IRT_B_New = table.Column<double>(type: "float", nullable: false),
                    LogLikelihood = table.Column<double>(type: "float", nullable: false),
                    WasRecalibrated = table.Column<bool>(type: "bit", nullable: false),
                    SkipReason = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    TriggeredBy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IRTCalibrationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IRTCalibrationLogs_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IRTCalibrationLogs_CalibratedAt",
                table: "IRTCalibrationLogs",
                column: "CalibratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_IRTCalibrationLogs_QuestionId",
                table: "IRTCalibrationLogs",
                column: "QuestionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IRTCalibrationLogs");
        }
    }
}
