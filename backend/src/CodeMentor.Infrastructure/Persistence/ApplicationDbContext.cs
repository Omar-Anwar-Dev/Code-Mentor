using System.Text.Json;
using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Audit;
using CodeMentor.Domain.Gamification;
using CodeMentor.Domain.LearningCV;
using CodeMentor.Domain.MentorChat;
using CodeMentor.Domain.Notifications;
using CodeMentor.Domain.ProjectAudits;
using CodeMentor.Domain.Skills;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace CodeMentor.Infrastructure.Persistence;

public class ApplicationDbContext
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OAuthToken> OAuthTokens => Set<OAuthToken>();

    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<AssessmentResponse> AssessmentResponses => Set<AssessmentResponse>();
    public DbSet<SkillScore> SkillScores => Set<SkillScore>();
    public DbSet<CodeQualityScore> CodeQualityScores => Set<CodeQualityScore>();

    public DbSet<Domain.LearningCV.LearningCV> LearningCVs => Set<Domain.LearningCV.LearningCV>();
    public DbSet<LearningCVView> LearningCVViews => Set<LearningCVView>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<LearningPath> LearningPaths => Set<LearningPath>();
    public DbSet<PathTask> PathTasks => Set<PathTask>();

    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<StaticAnalysisResult> StaticAnalysisResults => Set<StaticAnalysisResult>();
    public DbSet<AIAnalysisResult> AIAnalysisResults => Set<AIAnalysisResult>();
    public DbSet<Recommendation> Recommendations => Set<Recommendation>();
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<FeedbackRating> FeedbackRatings => Set<FeedbackRating>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // S14-T1 / ADR-046: per-user prefs + email send audit + account-delete cooling-off ledger.
    // NOTE: explicit Domain.Users qualifier because CodeMentor.Infrastructure.UserSettings (the
    // S14-T2 service folder) shadows the type name in this file's scope. Same pattern as
    // Domain.LearningCV.LearningCV at line 34.
    public DbSet<Domain.Users.UserSettings> UserSettings => Set<Domain.Users.UserSettings>();
    public DbSet<EmailDelivery> EmailDeliveries => Set<EmailDelivery>();
    public DbSet<UserAccountDeletionRequest> UserAccountDeletionRequests => Set<UserAccountDeletionRequest>();

    public DbSet<XpTransaction> XpTransactions => Set<XpTransaction>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();

    // S9-T1 / F11 (Project Audit — ADR-031). Parallel to Submissions, not branched.
    public DbSet<ProjectAudit> ProjectAudits => Set<ProjectAudit>();
    public DbSet<ProjectAuditResult> ProjectAuditResults => Set<ProjectAuditResult>();
    public DbSet<AuditStaticAnalysisResult> AuditStaticAnalysisResults => Set<AuditStaticAnalysisResult>();

    // S10-T2 / F12 (Mentor Chat — ADR-036). Polymorphic by Scope; no DB FK on ScopeId.
    public DbSet<MentorChatSession> MentorChatSessions => Set<MentorChatSession>();
    public DbSet<MentorChatMessage> MentorChatMessages => Set<MentorChatMessage>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("Users");
            b.Property(u => u.FullName).HasMaxLength(100).IsRequired();
            b.Property(u => u.GitHubUsername).HasMaxLength(40);
            b.Property(u => u.ProfilePictureUrl).HasMaxLength(500);
            b.HasIndex(u => u.Email).IsUnique();
            // S14-T1 / ADR-046: soft-delete index for listing/admin paths. Login path
            // does NOT apply this filter (auto-cancel via UserAccountDeletionRequest at S14-T9).
            b.HasIndex(u => u.IsDeleted)
                .HasDatabaseName("IX_Users_IsDeleted");
        });

        builder.Entity<ApplicationRole>(b => b.ToTable("Roles"));
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<Guid>>(b => b.ToTable("UserRoles"));
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<Guid>>(b => b.ToTable("UserClaims"));
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<Guid>>(b => b.ToTable("UserLogins"));
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityRoleClaim<Guid>>(b => b.ToTable("RoleClaims"));
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<Guid>>(b => b.ToTable("UserTokens"));

        builder.Entity<RefreshToken>(b =>
        {
            b.ToTable("RefreshTokens");
            b.HasKey(t => t.Id);
            b.Property(t => t.TokenHash).HasMaxLength(200).IsRequired();
            b.Property(t => t.ReplacedByTokenHash).HasMaxLength(200);
            b.Property(t => t.CreatedByIp).HasMaxLength(45);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.HasIndex(t => t.UserId);
            b.HasOne(t => t.User)
             .WithMany(u => u.RefreshTokens)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<OAuthToken>(b =>
        {
            b.ToTable("OAuthTokens");
            b.HasKey(t => t.Id);
            b.Property(t => t.Provider).HasMaxLength(20).IsRequired();
            b.Property(t => t.AccessTokenCipher).HasMaxLength(2000).IsRequired();
            b.Property(t => t.RefreshTokenCipher).HasMaxLength(2000);
            b.Property(t => t.Scopes).HasMaxLength(500);
            b.HasIndex(t => new { t.UserId, t.Provider }).IsUnique();
            b.HasOne(t => t.User)
             .WithMany()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        var stringListComparer = new ValueComparer<IReadOnlyList<string>>(
            (a, b) => a!.SequenceEqual(b!),
            l => l.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
            l => (IReadOnlyList<string>)l.ToList());

        builder.Entity<Question>(b =>
        {
            b.ToTable("Questions");
            b.HasKey(q => q.Id);
            b.Property(q => q.Content).IsRequired();
            b.Property(q => q.CorrectAnswer).HasMaxLength(4).IsRequired();
            b.Property(q => q.Explanation).HasMaxLength(2000);
            b.Property(q => q.Category).HasConversion<string>().HasMaxLength(30);

            b.Property(q => q.Options)
                .HasColumnName("OptionsJson")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(stringListComparer);

            // S15 / F15 (ADR-049 / ADR-050 / ADR-055): IRT + provenance + AI columns.
            b.Property(q => q.IRT_A).HasDefaultValue(1.0);
            b.Property(q => q.IRT_B).HasDefaultValue(0.0);
            b.Property(q => q.CalibrationSource)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(CalibrationSource.AI);
            b.Property(q => q.Source)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(QuestionSource.Manual);
            b.Property(q => q.CodeLanguage).HasMaxLength(32);
            b.Property(q => q.PromptVersion).HasMaxLength(64);
            // ApprovedById is a soft FK to AspNetUsers — no navigation
            // property to keep Domain layer free of Identity coupling.
            b.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(q => q.ApprovedById)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            b.HasIndex(q => new { q.Category, q.Difficulty });
            b.HasIndex(q => q.IsActive);
            b.HasIndex(q => q.Source);  // Sprint 16's drafts review filters by Source
        });

        builder.Entity<Assessment>(b =>
        {
            b.ToTable("Assessments");
            b.HasKey(a => a.Id);
            b.Property(a => a.Track).HasConversion<string>().HasMaxLength(20);
            b.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(a => a.SkillLevel).HasConversion<string>().HasMaxLength(20);
            b.Property(a => a.TotalScore).HasPrecision(5, 2);
            b.HasIndex(a => new { a.UserId, a.StartedAt });
            b.HasIndex(a => a.Status);
            b.HasMany(a => a.Responses)
             .WithOne(r => r.Assessment)
             .HasForeignKey(r => r.AssessmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AssessmentResponse>(b =>
        {
            b.ToTable("AssessmentResponses");
            b.HasKey(r => r.Id);
            b.Property(r => r.UserAnswer).HasMaxLength(4).IsRequired();
            b.Property(r => r.Category).HasConversion<string>().HasMaxLength(30);
            b.Property(r => r.IdempotencyKey).HasMaxLength(64);
            b.HasIndex(r => new { r.AssessmentId, r.OrderIndex }).IsUnique();
            b.HasIndex(r => new { r.AssessmentId, r.IdempotencyKey })
                .IsUnique()
                .HasFilter("[IdempotencyKey] IS NOT NULL");
            b.HasOne(r => r.Question)
             .WithMany()
             .HasForeignKey(r => r.QuestionId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<SkillScore>(b =>
        {
            b.ToTable("SkillScores");
            b.HasKey(s => s.Id);
            b.Property(s => s.Category).HasConversion<string>().HasMaxLength(30);
            b.Property(s => s.Level).HasConversion<string>().HasMaxLength(20);
            b.Property(s => s.Score).HasPrecision(5, 2);
            b.HasIndex(s => new { s.UserId, s.Category }).IsUnique();
        });

        builder.Entity<CodeQualityScore>(b =>
        {
            b.ToTable("CodeQualityScores");
            b.HasKey(s => s.Id);
            b.Property(s => s.Category).HasConversion<string>().HasMaxLength(30);
            b.Property(s => s.Score).HasPrecision(5, 2);
            b.HasIndex(s => new { s.UserId, s.Category }).IsUnique();
        });

        builder.Entity<Domain.LearningCV.LearningCV>(b =>
        {
            b.ToTable("LearningCVs");
            b.HasKey(c => c.Id);
            b.Property(c => c.PublicSlug).HasMaxLength(80);
            b.HasIndex(c => c.UserId).IsUnique();
            b.HasIndex(c => c.PublicSlug)
                .IsUnique()
                .HasFilter("[PublicSlug] IS NOT NULL");
        });

        builder.Entity<LearningCVView>(b =>
        {
            b.ToTable("LearningCVViews");
            b.HasKey(v => v.Id);
            b.Property(v => v.IpAddressHash).HasMaxLength(64).IsRequired();
            b.HasIndex(v => new { v.CVId, v.IpAddressHash, v.ViewedAt });
        });

        builder.Entity<AuditLog>(b =>
        {
            b.ToTable("AuditLogs");
            b.HasKey(a => a.Id);
            b.Property(a => a.Action).HasMaxLength(60).IsRequired();
            b.Property(a => a.EntityType).HasMaxLength(40).IsRequired();
            b.Property(a => a.EntityId).HasMaxLength(80).IsRequired();
            b.Property(a => a.IpAddress).HasMaxLength(45);
            b.HasIndex(a => a.CreatedAt);
            b.HasIndex(a => new { a.EntityType, a.EntityId });
        });

        // S8-T3: gamification — XP ledger + badge catalog + per-user awards.
        builder.Entity<XpTransaction>(b =>
        {
            b.ToTable("XpTransactions");
            b.HasKey(t => t.Id);
            b.Property(t => t.Reason).HasMaxLength(60).IsRequired();
            b.HasIndex(t => new { t.UserId, t.CreatedAt });
        });

        builder.Entity<Badge>(b =>
        {
            b.ToTable("Badges");
            b.HasKey(x => x.Id);
            b.Property(x => x.Key).HasMaxLength(60).IsRequired();
            b.Property(x => x.Name).HasMaxLength(80).IsRequired();
            b.Property(x => x.Description).HasMaxLength(300).IsRequired();
            b.Property(x => x.IconUrl).HasMaxLength(200);
            b.Property(x => x.Category).HasMaxLength(30).IsRequired();
            b.HasIndex(x => x.Key).IsUnique();
        });

        builder.Entity<UserBadge>(b =>
        {
            b.ToTable("UserBadges");
            b.HasKey(x => x.Id);
            b.HasOne(x => x.Badge)
                .WithMany()
                .HasForeignKey(x => x.BadgeId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.UserId, x.BadgeId }).IsUnique();
            b.HasIndex(x => x.UserId);
        });

        builder.Entity<TaskItem>(b =>
        {
            b.ToTable("Tasks");
            b.HasKey(t => t.Id);
            b.Property(t => t.Title).HasMaxLength(200).IsRequired();
            b.Property(t => t.Description).IsRequired();
            b.Property(t => t.AcceptanceCriteria); // nullable nvarchar(max) — markdown done-definition
            b.Property(t => t.Deliverables);       // nullable nvarchar(max) — markdown submission spec
            b.Property(t => t.Category).HasConversion<string>().HasMaxLength(30);
            b.Property(t => t.Track).HasConversion<string>().HasMaxLength(20);
            b.Property(t => t.ExpectedLanguage).HasConversion<string>().HasMaxLength(20);

            b.Property(t => t.Prerequisites)
                .HasColumnName("PrerequisitesJson")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(stringListComparer);

            b.HasIndex(t => new { t.Track, t.Difficulty });
            b.HasIndex(t => t.Category);
            b.HasIndex(t => t.IsActive);
        });

        builder.Entity<LearningPath>(b =>
        {
            b.ToTable("LearningPaths");
            b.HasKey(p => p.Id);
            b.Property(p => p.Track).HasConversion<string>().HasMaxLength(20);
            b.Property(p => p.ProgressPercent).HasPrecision(5, 2);
            b.HasIndex(p => p.UserId);
            b.HasIndex(p => new { p.UserId, p.IsActive })
                .IsUnique()
                .HasFilter("[IsActive] = 1");
            b.HasMany(p => p.Tasks)
             .WithOne(t => t.Path)
             .HasForeignKey(t => t.PathId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PathTask>(b =>
        {
            b.ToTable("PathTasks");
            b.HasKey(t => t.Id);
            b.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            b.HasIndex(t => new { t.PathId, t.OrderIndex }).IsUnique();
            b.HasIndex(t => t.TaskId);
            b.HasOne(t => t.Task)
             .WithMany()
             .HasForeignKey(t => t.TaskId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Submission>(b =>
        {
            b.ToTable("Submissions");
            b.HasKey(s => s.Id);
            b.Property(s => s.SubmissionType).HasConversion<string>().HasMaxLength(20);
            b.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(s => s.AiAnalysisStatus).HasConversion<string>().HasMaxLength(20);
            b.Property(s => s.RepositoryUrl).HasMaxLength(500);
            b.Property(s => s.BlobPath).HasMaxLength(500);
            b.Property(s => s.ErrorMessage).HasMaxLength(2000);
            b.HasIndex(s => new { s.UserId, s.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("IX_Submissions_UserId_CreatedAt_Desc");
            b.HasIndex(s => s.Status);
            b.HasIndex(s => s.TaskId);
        });

        builder.Entity<StaticAnalysisResult>(b =>
        {
            b.ToTable("StaticAnalysisResults");
            b.HasKey(r => r.Id);
            b.Property(r => r.Tool).HasConversion<string>().HasMaxLength(20);
            b.Property(r => r.IssuesJson).IsRequired();
            b.HasIndex(r => new { r.SubmissionId, r.Tool }).IsUnique();
            b.HasIndex(r => r.SubmissionId);
            b.HasOne(r => r.Submission)
             .WithMany()
             .HasForeignKey(r => r.SubmissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AIAnalysisResult>(b =>
        {
            b.ToTable("AIAnalysisResults");
            b.HasKey(r => r.Id);
            b.Property(r => r.FeedbackJson).IsRequired();
            b.Property(r => r.StrengthsJson).IsRequired();
            b.Property(r => r.WeaknessesJson).IsRequired();
            b.Property(r => r.ModelUsed).HasMaxLength(50).IsRequired();
            b.Property(r => r.PromptVersion).HasMaxLength(30).IsRequired();
            b.HasIndex(r => r.SubmissionId).IsUnique();
            b.HasOne(r => r.Submission)
             .WithMany()
             .HasForeignKey(r => r.SubmissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Recommendation>(b =>
        {
            b.ToTable("Recommendations");
            b.HasKey(r => r.Id);
            b.Property(r => r.Topic).HasMaxLength(200);
            b.Property(r => r.Reason).HasMaxLength(1000).IsRequired();
            b.HasIndex(r => r.SubmissionId);
            b.HasOne(r => r.Submission)
             .WithMany()
             .HasForeignKey(r => r.SubmissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Resource>(b =>
        {
            b.ToTable("Resources");
            b.HasKey(r => r.Id);
            b.Property(r => r.Title).HasMaxLength(200).IsRequired();
            b.Property(r => r.Url).HasMaxLength(500).IsRequired();
            b.Property(r => r.Topic).HasMaxLength(200).IsRequired();
            b.Property(r => r.Type).HasConversion<string>().HasMaxLength(20);
            b.HasIndex(r => r.SubmissionId);
            b.HasOne(r => r.Submission)
             .WithMany()
             .HasForeignKey(r => r.SubmissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // S8-T7 / SF4: feedback thumbs up/down per code-quality category.
        builder.Entity<FeedbackRating>(b =>
        {
            b.ToTable("FeedbackRatings");
            b.HasKey(r => r.Id);
            b.Property(r => r.Category).HasConversion<string>().HasMaxLength(30);
            b.Property(r => r.Vote).HasConversion<string>().HasMaxLength(10);
            b.HasIndex(r => new { r.SubmissionId, r.Category }).IsUnique();
            b.HasOne(r => r.Submission)
             .WithMany()
             .HasForeignKey(r => r.SubmissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Notification>(b =>
        {
            b.ToTable("Notifications");
            b.HasKey(n => n.Id);
            b.Property(n => n.Type).HasConversion<string>().HasMaxLength(30);
            b.Property(n => n.Title).HasMaxLength(200).IsRequired();
            b.Property(n => n.Message).HasMaxLength(2000).IsRequired();
            b.Property(n => n.Link).HasMaxLength(500);
            // Architecture §5.3: Notifications(UserId, IsRead, CreatedAt DESC) for the bell-icon query.
            b.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt })
                .IsDescending(false, false, true)
                .HasDatabaseName("IX_Notifications_User_Unread_CreatedAt_Desc");
        });

        // S9-T1 / F11: Project Audit module (ADR-031). Domain 6 in architecture.md §5.
        // Parallel to Submissions, not branched inside it.
        builder.Entity<ProjectAudit>(b =>
        {
            b.ToTable("ProjectAudits");
            b.HasKey(a => a.Id);
            b.Property(a => a.ProjectName).HasMaxLength(200).IsRequired();
            b.Property(a => a.ProjectDescriptionJson).IsRequired();
            b.Property(a => a.SourceType).HasConversion<string>().HasMaxLength(20);
            b.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(a => a.AiReviewStatus).HasConversion<string>().HasMaxLength(20);
            b.Property(a => a.RepositoryUrl).HasMaxLength(500);
            b.Property(a => a.BlobPath).HasMaxLength(500);
            b.Property(a => a.Grade).HasMaxLength(2);
            b.Property(a => a.ErrorMessage).HasMaxLength(2000);

            // Architecture §5.3 Domain 6 indexes:
            b.HasIndex(a => new { a.UserId, a.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("IX_ProjectAudits_UserId_CreatedAt_Desc");
            b.HasIndex(a => a.Status);
            b.HasIndex(a => new { a.IsDeleted, a.UserId })
                .HasDatabaseName("IX_ProjectAudits_IsDeleted_UserId");
        });

        builder.Entity<ProjectAuditResult>(b =>
        {
            b.ToTable("ProjectAuditResults");
            b.HasKey(r => r.Id);
            b.Property(r => r.ScoresJson).IsRequired();
            b.Property(r => r.StrengthsJson).IsRequired();
            b.Property(r => r.CriticalIssuesJson).IsRequired();
            b.Property(r => r.WarningsJson).IsRequired();
            b.Property(r => r.SuggestionsJson).IsRequired();
            b.Property(r => r.MissingFeaturesJson).IsRequired();
            b.Property(r => r.RecommendedImprovementsJson).IsRequired();
            b.Property(r => r.InlineAnnotationsJson).IsRequired();
            b.Property(r => r.TechStackAssessment).IsRequired();
            // SBF-1 / audit-v2: nullable nvarchar(max) — defaults to empty string
            // for v1 rows so the existing audits parse without migration drama.
            b.Property(r => r.ExecutiveSummary).HasDefaultValue("");
            b.Property(r => r.ArchitectureNotes).HasDefaultValue("");
            b.Property(r => r.ModelUsed).HasMaxLength(50).IsRequired();
            b.Property(r => r.PromptVersion).HasMaxLength(30).IsRequired();
            b.HasIndex(r => r.AuditId).IsUnique();
            b.HasOne(r => r.Audit)
             .WithMany()
             .HasForeignKey(r => r.AuditId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AuditStaticAnalysisResult>(b =>
        {
            b.ToTable("AuditStaticAnalysisResults");
            b.HasKey(r => r.Id);
            b.Property(r => r.Tool).HasConversion<string>().HasMaxLength(20);
            b.Property(r => r.IssuesJson).IsRequired();
            b.HasIndex(r => new { r.AuditId, r.Tool }).IsUnique();
            b.HasIndex(r => r.AuditId);
            b.HasOne(r => r.Audit)
             .WithMany()
             .HasForeignKey(r => r.AuditId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // S10-T2 / F12: Mentor Chat. Polymorphic ScopeId (Submissions or ProjectAudits)
        // — ownership enforced in the application layer at session-create time, not by FK.
        builder.Entity<MentorChatSession>(b =>
        {
            b.ToTable("MentorChatSessions");
            b.HasKey(s => s.Id);
            b.Property(s => s.Scope).HasConversion<string>().HasMaxLength(20);
            // architecture §5 Domain 7: at most one chat session per (user, submission) or (user, audit)
            b.HasIndex(s => new { s.UserId, s.Scope, s.ScopeId })
                .IsUnique()
                .HasDatabaseName("IX_MentorChatSessions_User_Scope_ScopeId");
            b.HasIndex(s => s.UserId);
        });

        builder.Entity<MentorChatMessage>(b =>
        {
            b.ToTable("MentorChatMessages");
            b.HasKey(m => m.Id);
            b.Property(m => m.Role).HasConversion<string>().HasMaxLength(20);
            b.Property(m => m.ContextMode).HasConversion<string>().HasMaxLength(20);
            b.Property(m => m.Content).IsRequired();

            b.Property(m => m.RetrievedChunkIds)
                .HasColumnName("RetrievedChunkIdsJson")
                .HasConversion(
                    v => v == null
                        ? null
                        : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null
                        ? null
                        : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(stringListComparer);

            // architecture §5.3 Domain 7: turn-ordered history retrieval
            b.HasIndex(m => new { m.SessionId, m.CreatedAt })
                .HasDatabaseName("IX_MentorChatMessages_Session_CreatedAt");
            b.HasOne<MentorChatSession>()
             .WithMany()
             .HasForeignKey(m => m.SessionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // S14-T1 / ADR-046: per-user settings (5 notification prefs × 2 channels + 3 privacy toggles). 1-1 with User.
        builder.Entity<Domain.Users.UserSettings>(b =>
        {
            b.ToTable("UserSettings");
            b.HasKey(s => s.Id);
            b.HasIndex(s => s.UserId).IsUnique();
        });

        // S14-T1 / ADR-046: persisted email send audit row + retry state.
        builder.Entity<EmailDelivery>(b =>
        {
            b.ToTable("EmailDeliveries");
            b.HasKey(d => d.Id);
            b.Property(d => d.Type).HasMaxLength(40).IsRequired();
            b.Property(d => d.ToAddress).HasMaxLength(254).IsRequired();
            b.Property(d => d.Subject).HasMaxLength(300).IsRequired();
            b.Property(d => d.BodyHtml).IsRequired();
            b.Property(d => d.BodyText).IsRequired();
            b.Property(d => d.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(d => d.ProviderMessageId).HasMaxLength(200);
            b.Property(d => d.LastError).HasMaxLength(2000);
            // Retry-queue scan: rows where Status=Pending and NextAttemptAt <= now.
            b.HasIndex(d => new { d.Status, d.NextAttemptAt })
                .HasDatabaseName("IX_EmailDeliveries_Status_NextAttemptAt");
            // Admin per-user history.
            b.HasIndex(d => new { d.UserId, d.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("IX_EmailDeliveries_UserId_CreatedAt_Desc");
        });

        // S14-T1 / ADR-046: 30-day cooling-off ledger for account-delete requests.
        // Active row per user = (CancelledAt IS NULL AND HardDeletedAt IS NULL).
        builder.Entity<UserAccountDeletionRequest>(b =>
        {
            b.ToTable("UserAccountDeletionRequests");
            b.HasKey(r => r.Id);
            b.Property(r => r.Reason).HasMaxLength(2000);
            b.Property(r => r.ScheduledJobId).HasMaxLength(100);
            b.HasIndex(r => new { r.UserId, r.CancelledAt, r.HardDeletedAt })
                .HasDatabaseName("IX_UserAccountDeletionRequests_User_Active");
        });
    }
}
