using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLearningPathLineage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InitialSkillProfileJson",
                table: "LearningPaths",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreviousLearningPathId",
                table: "LearningPaths",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "LearningPaths",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_LearningPaths_PreviousLearningPathId",
                table: "LearningPaths",
                column: "PreviousLearningPathId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LearningPaths_PreviousLearningPathId",
                table: "LearningPaths");

            migrationBuilder.DropColumn(
                name: "InitialSkillProfileJson",
                table: "LearningPaths");

            migrationBuilder.DropColumn(
                name: "PreviousLearningPathId",
                table: "LearningPaths");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "LearningPaths");
        }
    }
}
