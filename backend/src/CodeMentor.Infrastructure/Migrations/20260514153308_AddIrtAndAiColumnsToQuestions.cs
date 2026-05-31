using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIrtAndAiColumnsToQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Questions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedById",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CalibrationSource",
                table: "Questions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "AI");

            migrationBuilder.AddColumn<string>(
                name: "CodeLanguage",
                table: "Questions",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeSnippet",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmbeddingJson",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "IRT_A",
                table: "Questions",
                type: "float",
                nullable: false,
                defaultValue: 1.0);

            migrationBuilder.AddColumn<double>(
                name: "IRT_B",
                table: "Questions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "PromptVersion",
                table: "Questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Questions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_ApprovedById",
                table: "Questions",
                column: "ApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_Source",
                table: "Questions",
                column: "Source");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Users_ApprovedById",
                table: "Questions",
                column: "ApprovedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Users_ApprovedById",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_ApprovedById",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_Source",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "ApprovedById",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CalibrationSource",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CodeLanguage",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CodeSnippet",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "EmbeddingJson",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "IRT_A",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "IRT_B",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "PromptVersion",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Questions");
        }
    }
}
