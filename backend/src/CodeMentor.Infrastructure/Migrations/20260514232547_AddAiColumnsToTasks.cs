using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiColumnsToTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Tasks",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedById",
                table: "Tasks",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmbeddingJson",
                table: "Tasks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LearningGainJson",
                table: "Tasks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PromptVersion",
                table: "Tasks",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillTagsJson",
                table: "Tasks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Tasks",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.CreateTable(
                name: "TaskDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PositionInBatch = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AcceptanceCriteria = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Deliverables = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Track = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ExpectedLanguage = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EstimatedHours = table.Column<int>(type: "int", nullable: false),
                    PrerequisitesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SkillTagsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LearningGainJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PromptVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GeneratedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecidedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OriginalDraftJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ApprovedTaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskDrafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskDrafts_Tasks_ApprovedTaskId",
                        column: x => x.ApprovedTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TaskDrafts_Users_DecidedById",
                        column: x => x.DecidedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TaskDrafts_Users_GeneratedById",
                        column: x => x.GeneratedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ApprovedById",
                table: "Tasks",
                column: "ApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_Source",
                table: "Tasks",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_TaskDrafts_ApprovedTaskId",
                table: "TaskDrafts",
                column: "ApprovedTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskDrafts_BatchId",
                table: "TaskDrafts",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskDrafts_BatchId_PositionInBatch",
                table: "TaskDrafts",
                columns: new[] { "BatchId", "PositionInBatch" });

            migrationBuilder.CreateIndex(
                name: "IX_TaskDrafts_DecidedById",
                table: "TaskDrafts",
                column: "DecidedById");

            migrationBuilder.CreateIndex(
                name: "IX_TaskDrafts_GeneratedById",
                table: "TaskDrafts",
                column: "GeneratedById");

            migrationBuilder.CreateIndex(
                name: "IX_TaskDrafts_Status",
                table: "TaskDrafts",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Users_ApprovedById",
                table: "Tasks",
                column: "ApprovedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Users_ApprovedById",
                table: "Tasks");

            migrationBuilder.DropTable(
                name: "TaskDrafts");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_ApprovedById",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_Source",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ApprovedById",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "EmbeddingJson",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "LearningGainJson",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "PromptVersion",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "SkillTagsJson",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Tasks");
        }
    }
}
