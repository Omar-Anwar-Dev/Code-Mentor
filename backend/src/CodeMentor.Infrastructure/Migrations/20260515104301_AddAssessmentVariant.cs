using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentVariant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Variant",
                table: "Assessments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Initial");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_UserId_Variant_Status",
                table: "Assessments",
                columns: new[] { "UserId", "Variant", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assessments_UserId_Variant_Status",
                table: "Assessments");

            migrationBuilder.DropColumn(
                name: "Variant",
                table: "Assessments");
        }
    }
}
