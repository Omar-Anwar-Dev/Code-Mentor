using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAudits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ProjectDescriptionJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RepositoryUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BlobPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AiReviewStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OverallScore = table.Column<int>(type: "int", nullable: true),
                    Grade = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    AiAutoRetryCount = table.Column<int>(type: "int", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectAudits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditStaticAnalysisResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tool = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IssuesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MetricsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExecutionTimeMs = table.Column<int>(type: "int", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditStaticAnalysisResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditStaticAnalysisResults_ProjectAudits_AuditId",
                        column: x => x.AuditId,
                        principalTable: "ProjectAudits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectAuditResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScoresJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StrengthsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CriticalIssuesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WarningsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SuggestionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MissingFeaturesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecommendedImprovementsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TechStackAssessment = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InlineAnnotationsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ModelUsed = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PromptVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TokensInput = table.Column<int>(type: "int", nullable: false),
                    TokensOutput = table.Column<int>(type: "int", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectAuditResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectAuditResults_ProjectAudits_AuditId",
                        column: x => x.AuditId,
                        principalTable: "ProjectAudits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditStaticAnalysisResults_AuditId",
                table: "AuditStaticAnalysisResults",
                column: "AuditId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditStaticAnalysisResults_AuditId_Tool",
                table: "AuditStaticAnalysisResults",
                columns: new[] { "AuditId", "Tool" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAuditResults_AuditId",
                table: "ProjectAuditResults",
                column: "AuditId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAudits_IsDeleted_UserId",
                table: "ProjectAudits",
                columns: new[] { "IsDeleted", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAudits_Status",
                table: "ProjectAudits",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAudits_UserId_CreatedAt_Desc",
                table: "ProjectAudits",
                columns: new[] { "UserId", "CreatedAt" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditStaticAnalysisResults");

            migrationBuilder.DropTable(
                name: "ProjectAuditResults");

            migrationBuilder.DropTable(
                name: "ProjectAudits");
        }
    }
}
