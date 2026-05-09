using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMentor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMentorChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "MentorIndexedAt",
                table: "Submissions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MentorIndexedAt",
                table: "ProjectAudits",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MentorChatSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ScopeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MentorChatSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MentorChatMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RetrievedChunkIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TokensInput = table.Column<int>(type: "int", nullable: true),
                    TokensOutput = table.Column<int>(type: "int", nullable: true),
                    ContextMode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MentorChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MentorChatMessages_MentorChatSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "MentorChatSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MentorChatMessages_Session_CreatedAt",
                table: "MentorChatMessages",
                columns: new[] { "SessionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MentorChatSessions_User_Scope_ScopeId",
                table: "MentorChatSessions",
                columns: new[] { "UserId", "Scope", "ScopeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MentorChatSessions_UserId",
                table: "MentorChatSessions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MentorChatMessages");

            migrationBuilder.DropTable(
                name: "MentorChatSessions");

            migrationBuilder.DropColumn(
                name: "MentorIndexedAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "MentorIndexedAt",
                table: "ProjectAudits");
        }
    }
}
