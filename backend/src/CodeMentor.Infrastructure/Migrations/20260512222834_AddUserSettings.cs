using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HardDeleteAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "EmailDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ToAddress = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    BodyHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BodyText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ProviderMessageId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    NextAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailDeliveries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserAccountDeletionRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    HardDeleteAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledJobId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HardDeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAccountDeletionRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NotifSubmissionEmail = table.Column<bool>(type: "bit", nullable: false),
                    NotifSubmissionInApp = table.Column<bool>(type: "bit", nullable: false),
                    NotifAuditEmail = table.Column<bool>(type: "bit", nullable: false),
                    NotifAuditInApp = table.Column<bool>(type: "bit", nullable: false),
                    NotifWeaknessEmail = table.Column<bool>(type: "bit", nullable: false),
                    NotifWeaknessInApp = table.Column<bool>(type: "bit", nullable: false),
                    NotifBadgeEmail = table.Column<bool>(type: "bit", nullable: false),
                    NotifBadgeInApp = table.Column<bool>(type: "bit", nullable: false),
                    NotifSecurityEmail = table.Column<bool>(type: "bit", nullable: false),
                    NotifSecurityInApp = table.Column<bool>(type: "bit", nullable: false),
                    ProfileDiscoverable = table.Column<bool>(type: "bit", nullable: false),
                    PublicCvDefault = table.Column<bool>(type: "bit", nullable: false),
                    ShowInLeaderboard = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsDeleted",
                table: "Users",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_EmailDeliveries_Status_NextAttemptAt",
                table: "EmailDeliveries",
                columns: new[] { "Status", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EmailDeliveries_UserId_CreatedAt_Desc",
                table: "EmailDeliveries",
                columns: new[] { "UserId", "CreatedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_UserAccountDeletionRequests_User_Active",
                table: "UserAccountDeletionRequests",
                columns: new[] { "UserId", "CancelledAt", "HardDeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserSettings_UserId",
                table: "UserSettings",
                column: "UserId",
                unique: true);

            // S14-T1 / ADR-046: seed a default UserSettings row for every existing user so
            // NotificationService.RaiseAsync, EmailDeliveryService dispatch, and admin
            // listings all have a row to read for every user. Defaults: PublicCvDefault=0
            // (private; user opts-in per CV); every other flag = 1 (on). New users
            // created after this migration get a default row lazily on first GET via
            // UserSettingsService.
            migrationBuilder.Sql(@"
                INSERT INTO [UserSettings]
                    ([Id], [UserId], [NotifSubmissionEmail], [NotifSubmissionInApp],
                     [NotifAuditEmail], [NotifAuditInApp], [NotifWeaknessEmail], [NotifWeaknessInApp],
                     [NotifBadgeEmail], [NotifBadgeInApp], [NotifSecurityEmail], [NotifSecurityInApp],
                     [ProfileDiscoverable], [PublicCvDefault], [ShowInLeaderboard],
                     [CreatedAt], [UpdatedAt])
                SELECT NEWID(), u.[Id], 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
                       SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM [Users] u
                WHERE NOT EXISTS (SELECT 1 FROM [UserSettings] s WHERE s.[UserId] = u.[Id]);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailDeliveries");

            migrationBuilder.DropTable(
                name: "UserAccountDeletionRequests");

            migrationBuilder.DropTable(
                name: "UserSettings");

            migrationBuilder.DropIndex(
                name: "IX_Users_IsDeleted",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "HardDeleteAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Users");
        }
    }
}
