using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QuestionDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PositionInBatch = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CodeSnippet = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CodeLanguage = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    OptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrectAnswer = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IRT_A = table.Column<double>(type: "float", nullable: false),
                    IRT_B = table.Column<double>(type: "float", nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    PromptVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GeneratedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecidedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OriginalDraftJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ApprovedQuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionDrafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionDrafts_Questions_ApprovedQuestionId",
                        column: x => x.ApprovedQuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_QuestionDrafts_Users_DecidedById",
                        column: x => x.DecidedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_QuestionDrafts_Users_GeneratedById",
                        column: x => x.GeneratedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDrafts_ApprovedQuestionId",
                table: "QuestionDrafts",
                column: "ApprovedQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDrafts_BatchId",
                table: "QuestionDrafts",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDrafts_BatchId_PositionInBatch",
                table: "QuestionDrafts",
                columns: new[] { "BatchId", "PositionInBatch" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDrafts_DecidedById",
                table: "QuestionDrafts",
                column: "DecidedById");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDrafts_GeneratedById",
                table: "QuestionDrafts",
                column: "GeneratedById");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDrafts_Status",
                table: "QuestionDrafts",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuestionDrafts");
        }
    }
}
