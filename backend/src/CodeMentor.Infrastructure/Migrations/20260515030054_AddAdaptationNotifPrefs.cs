using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <summary>
    /// S20-T0 / ADR-061: extend <c>UserSettings</c> with the 6th notification pref
    /// family — <c>NotifAdaptation{Email,InApp}</c>. Both default ON so the F16
    /// "AI proposed N changes" adaptation banner + email surface for every existing
    /// learner immediately. Backfill is implicit via the column DEFAULT clause:
    /// SQL Server's <c>ALTER TABLE ... ADD col bit NOT NULL DEFAULT 1</c> writes
    /// the default into every existing row in a single pass — no separate data
    /// step needed.
    /// </summary>
    public partial class AddAdaptationNotifPrefs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Default ON for both channels (per ADR-061). The DEFAULT clause backfills
            // every existing UserSettings row to TRUE; new inserts from
            // UserSettingsService.LazyInitAsync also resolve to TRUE via the entity
            // initialiser (which mirrors the column default).
            migrationBuilder.AddColumn<bool>(
                name: "NotifAdaptationEmail",
                table: "UserSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifAdaptationInApp",
                table: "UserSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotifAdaptationEmail",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifAdaptationInApp",
                table: "UserSettings");
        }
    }
}
