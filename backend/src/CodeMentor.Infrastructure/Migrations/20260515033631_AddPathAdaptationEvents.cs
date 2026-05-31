using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <summary>
    /// S20-T3 / F16 (ADR-053): create the PathAdaptationEvents audit table +
    /// add LearningPath.LastAdaptedAt (nullable datetime2) for the 24-hour
    /// cooldown gate. Three indexes per docs/assessment-learning-path.md §4.2.3:
    ///  - (PathId, TriggeredAt DESC) — timeline render
    ///  - (UserId, LearnerDecision) — pending-modal lookup
    ///  - IdempotencyKey UNIQUE — dedupes concurrent PathAdaptationJob enqueues
    /// FK to LearningPaths is Cascade so deleting a path also deletes its
    /// adaptation audit trail (consistent with PathTasks cascade behaviour).
    /// </summary>
    public partial class AddPathAdaptationEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastAdaptedAt",
                table: "LearningPaths",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PathAdaptationEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PathId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TriggeredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Trigger = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    SignalLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BeforeStateJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AfterStateJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AIReasoningText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConfidenceScore = table.Column<double>(type: "float", nullable: false),
                    ActionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LearnerDecision = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RespondedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AIPromptVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TokensInput = table.Column<int>(type: "int", nullable: true),
                    TokensOutput = table.Column<int>(type: "int", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathAdaptationEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PathAdaptationEvents_LearningPaths_PathId",
                        column: x => x.PathId,
                        principalTable: "LearningPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PathAdaptationEvents_IdempotencyKey",
                table: "PathAdaptationEvents",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PathAdaptationEvents_PathId_TriggeredAt_Desc",
                table: "PathAdaptationEvents",
                columns: new[] { "PathId", "TriggeredAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_PathAdaptationEvents_UserId_LearnerDecision",
                table: "PathAdaptationEvents",
                columns: new[] { "UserId", "LearnerDecision" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PathAdaptationEvents");

            migrationBuilder.DropColumn(
                name: "LastAdaptedAt",
                table: "LearningPaths");
        }
    }
}
