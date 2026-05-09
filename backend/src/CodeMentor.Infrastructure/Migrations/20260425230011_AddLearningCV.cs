using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLearningCV : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LearningCVs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PublicSlug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    IsPublic = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastGeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ViewCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningCVs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LearningCVViews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CVId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IpAddressHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningCVViews", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LearningCVs_PublicSlug",
                table: "LearningCVs",
                column: "PublicSlug",
                unique: true,
                filter: "[PublicSlug] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LearningCVs_UserId",
                table: "LearningCVs",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LearningCVViews_CVId_IpAddressHash_ViewedAt",
                table: "LearningCVViews",
                columns: new[] { "CVId", "IpAddressHash", "ViewedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LearningCVs");

            migrationBuilder.DropTable(
                name: "LearningCVViews");
        }
    }
}
