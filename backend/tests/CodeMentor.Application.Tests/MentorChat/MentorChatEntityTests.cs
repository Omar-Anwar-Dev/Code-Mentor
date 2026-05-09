using CodeMentor.Domain.MentorChat;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Submissions;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace CodeMentor.Application.Tests.MentorChat;

/// <summary>
/// S10-T2 / F12 acceptance:
///  - MentorChatSessions / MentorChatMessages tables created via model mapping.
///  - Round-trip test for Role / ContextMode / Scope enums (stored as strings)
///    and RetrievedChunkIds JSON column.
///  - Unique constraint (UserId, Scope, ScopeId) rejects duplicate triple.
///  - Index (SessionId, CreatedAt) configured on messages.
///  - Submissions.MentorIndexedAt + ProjectAudits.MentorIndexedAt nullable timestamps.
///  - Cascade-delete from session → messages.
/// </summary>
public class MentorChatEntityTests
{
    private static ApplicationDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"MentorChat_{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(opts);
    }

    [Fact]
    public async Task MentorChatSession_Persists_And_Reloads_With_EnumString()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var submissionId = Guid.NewGuid();

        var session = new MentorChatSession
        {
            UserId = userId,
            Scope = MentorChatScope.Submission,
            ScopeId = submissionId,
        };
        db.MentorChatSessions.Add(session);
        await db.SaveChangesAsync();

        var fetched = await db.MentorChatSessions.AsNoTracking().SingleAsync(s => s.Id == session.Id);
        Assert.Equal(MentorChatScope.Submission, fetched.Scope);
        Assert.Equal(userId, fetched.UserId);
        Assert.Equal(submissionId, fetched.ScopeId);
        Assert.Null(fetched.LastMessageAt);
    }

    [Fact]
    public async Task MentorChatMessage_Persists_RetrievedChunkIds_Json_RoundTrip()
    {
        using var db = NewDb();

        var session = new MentorChatSession
        {
            UserId = Guid.NewGuid(),
            Scope = MentorChatScope.Audit,
            ScopeId = Guid.NewGuid(),
        };
        db.MentorChatSessions.Add(session);
        await db.SaveChangesAsync();

        var assistant = new MentorChatMessage
        {
            SessionId = session.Id,
            Role = MentorChatRole.Assistant,
            Content = "Line 42 is a SQL injection — use parameterized queries.",
            RetrievedChunkIds = new[] { "chunk-001", "chunk-042", "chunk-088" },
            TokensInput = 1200,
            TokensOutput = 180,
            ContextMode = MentorChatContextMode.Rag,
        };
        var user = new MentorChatMessage
        {
            SessionId = session.Id,
            Role = MentorChatRole.User,
            Content = "Why is line 42 a security risk?",
            // user turns leave RetrievedChunkIds / token counts / ContextMode null
        };
        db.MentorChatMessages.AddRange(assistant, user);
        await db.SaveChangesAsync();

        var fetchedAssistant = await db.MentorChatMessages.AsNoTracking()
            .SingleAsync(m => m.Id == assistant.Id);
        Assert.Equal(MentorChatRole.Assistant, fetchedAssistant.Role);
        Assert.Equal(MentorChatContextMode.Rag, fetchedAssistant.ContextMode);
        Assert.Equal(1200, fetchedAssistant.TokensInput);
        Assert.Equal(180, fetchedAssistant.TokensOutput);
        Assert.NotNull(fetchedAssistant.RetrievedChunkIds);
        Assert.Equal(3, fetchedAssistant.RetrievedChunkIds!.Count);
        Assert.Equal("chunk-042", fetchedAssistant.RetrievedChunkIds[1]);

        var fetchedUser = await db.MentorChatMessages.AsNoTracking()
            .SingleAsync(m => m.Id == user.Id);
        Assert.Equal(MentorChatRole.User, fetchedUser.Role);
        Assert.Null(fetchedUser.RetrievedChunkIds);
        Assert.Null(fetchedUser.TokensInput);
        Assert.Null(fetchedUser.ContextMode);
    }

    [Fact]
    public void MentorChatSession_UniqueIndex_OnUserScopeScopeId_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(MentorChatSession))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 3 &&
            i.Properties[0].Name == nameof(MentorChatSession.UserId) &&
            i.Properties[1].Name == nameof(MentorChatSession.Scope) &&
            i.Properties[2].Name == nameof(MentorChatSession.ScopeId));

        Assert.NotNull(ix);
        Assert.True(ix!.IsUnique);
    }

    [Fact]
    public void MentorChatMessage_TurnOrderIndex_OnSessionCreatedAt_IsConfigured()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(MentorChatMessage))!;

        var ix = entityType.GetIndexes().FirstOrDefault(i =>
            i.Properties.Count == 2 &&
            i.Properties[0].Name == nameof(MentorChatMessage.SessionId) &&
            i.Properties[1].Name == nameof(MentorChatMessage.CreatedAt));

        Assert.NotNull(ix);
    }

    [Fact]
    public async Task MentorChatSession_Duplicate_UserScopeScopeId_Triple_IsRejected()
    {
        // Use a relational SQLite in-memory provider for THIS test only — the
        // EF in-memory provider doesn't enforce unique indexes, so we'd miss the
        // very behaviour the acceptance criterion calls out.
        await using var connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new ApplicationDbContext(opts);
        await db.Database.EnsureCreatedAsync();

        var userId = Guid.NewGuid();
        var scopeId = Guid.NewGuid();

        db.MentorChatSessions.Add(new MentorChatSession
        {
            UserId = userId,
            Scope = MentorChatScope.Submission,
            ScopeId = scopeId,
        });
        await db.SaveChangesAsync();

        db.MentorChatSessions.Add(new MentorChatSession
        {
            UserId = userId,
            Scope = MentorChatScope.Submission,
            ScopeId = scopeId,
        });

        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Contains("UNIQUE", ex.InnerException!.Message, StringComparison.OrdinalIgnoreCase);

        // Same user can have a session for a DIFFERENT scope (Audit) on the SAME ScopeId — it's the triple that's unique.
        var newDb = new ApplicationDbContext(opts);
        newDb.MentorChatSessions.Add(new MentorChatSession
        {
            UserId = userId,
            Scope = MentorChatScope.Audit,
            ScopeId = scopeId,
        });
        await newDb.SaveChangesAsync();
        Assert.Equal(2, await newDb.MentorChatSessions.CountAsync());
    }

    [Fact]
    public async Task MentorChatMessages_CascadeDelete_When_SessionRemoved()
    {
        using var db = NewDb();
        var session = new MentorChatSession
        {
            UserId = Guid.NewGuid(),
            Scope = MentorChatScope.Submission,
            ScopeId = Guid.NewGuid(),
        };
        db.MentorChatSessions.Add(session);
        db.MentorChatMessages.Add(new MentorChatMessage
        {
            SessionId = session.Id,
            Role = MentorChatRole.User,
            Content = "hello",
        });
        await db.SaveChangesAsync();

        Assert.Equal(1, await db.MentorChatMessages.CountAsync());
        db.MentorChatSessions.Remove(session);
        await db.SaveChangesAsync();
        // EF InMemory respects cascade-delete configured on the relationship.
        Assert.Equal(0, await db.MentorChatMessages.CountAsync());
    }

    [Fact]
    public void Submission_MentorIndexedAt_Is_Nullable_DateTime()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(Submission))!;
        var prop = entityType.FindProperty(nameof(Submission.MentorIndexedAt))!;

        Assert.Equal(typeof(DateTime?), prop.ClrType);
        Assert.True(prop.IsNullable);
    }

    [Fact]
    public void ProjectAudit_MentorIndexedAt_Is_Nullable_DateTime()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(ProjectAudit))!;
        var prop = entityType.FindProperty(nameof(ProjectAudit.MentorIndexedAt))!;

        Assert.Equal(typeof(DateTime?), prop.ClrType);
        Assert.True(prop.IsNullable);
    }

    [Fact]
    public async Task Submission_MentorIndexedAt_Defaults_Null_RoundTrips_When_Set()
    {
        using var db = NewDb();
        var sub = new Submission
        {
            UserId = Guid.NewGuid(),
            TaskId = Guid.NewGuid(),
            SubmissionType = SubmissionType.Upload,
            BlobPath = "submissions-uploads/x.zip",
            Status = SubmissionStatus.Completed,
        };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();
        var fresh = await db.Submissions.AsNoTracking().SingleAsync(s => s.Id == sub.Id);
        Assert.Null(fresh.MentorIndexedAt);

        sub.MentorIndexedAt = new DateTime(2026, 8, 25, 10, 0, 0, DateTimeKind.Utc);
        await db.SaveChangesAsync();
        var indexed = await db.Submissions.AsNoTracking().SingleAsync(s => s.Id == sub.Id);
        Assert.Equal(new DateTime(2026, 8, 25, 10, 0, 0, DateTimeKind.Utc), indexed.MentorIndexedAt);
    }

    [Fact]
    public void MentorChatMessage_ContextMode_Is_Stored_As_NvarcharString()
    {
        using var db = NewDb();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entityType = model.FindEntityType(typeof(MentorChatMessage))!;
        var prop = entityType.FindProperty(nameof(MentorChatMessage.ContextMode))!;

        Assert.Equal(typeof(string), prop.GetProviderClrType() ?? prop.ClrType);
        Assert.Equal(20, prop.GetMaxLength());
        Assert.True(prop.IsNullable);
    }
}
