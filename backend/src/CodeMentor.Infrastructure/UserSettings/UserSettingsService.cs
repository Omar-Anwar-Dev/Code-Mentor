using CodeMentor.Application.UserSettings;
using CodeMentor.Domain.Users;
using CodeMentor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeMentor.Infrastructure.UserSettings;

/// <summary>
/// S14-T2 / ADR-046: read + partial-update for the caller's
/// <see cref="Domain.Users.UserSettings"/> row. Defends against the gap left
/// between the <c>AddUserSettings</c> migration's seed step (which inserts a
/// default row for every user that existed at migration time) and brand-new
/// users created afterward — both <see cref="GetForUserAsync"/> and
/// <see cref="UpdateForUserAsync"/> lazily insert a default row if absent.
///
/// Concurrency: two requests racing on the same user's lazy-init both try to
/// INSERT. The unique index on <c>UserId</c> (S14-T1) makes the second one
/// throw <see cref="DbUpdateException"/>; we catch it and re-read the row the
/// first insert committed.
/// </summary>
public sealed class UserSettingsService : IUserSettingsService
{
    private readonly ApplicationDbContext _db;

    public UserSettingsService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<UserSettingsDto> GetForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var settings = await _db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (settings is null)
        {
            settings = await LazyInitAsync(userId, ct);
        }

        return ToDto(settings);
    }

    public async Task<UserSettingsDto> UpdateForUserAsync(
        Guid userId,
        UserSettingsPatchRequest patch,
        CancellationToken ct = default)
    {
        var settings = await _db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (settings is null)
        {
            settings = await LazyInitAsync(userId, ct);
        }

        ApplyPatch(settings, patch);
        settings.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToDto(settings);
    }

    private async Task<Domain.Users.UserSettings> LazyInitAsync(Guid userId, CancellationToken ct)
    {
        var settings = new Domain.Users.UserSettings { UserId = userId };
        _db.UserSettings.Add(settings);
        try
        {
            await _db.SaveChangesAsync(ct);
            return settings;
        }
        catch (DbUpdateException)
        {
            // A concurrent request already inserted the row. Re-read it and use that.
            _db.Entry(settings).State = EntityState.Detached;
            return await _db.UserSettings.SingleAsync(s => s.UserId == userId, ct);
        }
    }

    private static void ApplyPatch(Domain.Users.UserSettings s, UserSettingsPatchRequest p)
    {
        if (p.NotifSubmissionEmail.HasValue) s.NotifSubmissionEmail = p.NotifSubmissionEmail.Value;
        if (p.NotifSubmissionInApp.HasValue) s.NotifSubmissionInApp = p.NotifSubmissionInApp.Value;
        if (p.NotifAuditEmail.HasValue) s.NotifAuditEmail = p.NotifAuditEmail.Value;
        if (p.NotifAuditInApp.HasValue) s.NotifAuditInApp = p.NotifAuditInApp.Value;
        if (p.NotifWeaknessEmail.HasValue) s.NotifWeaknessEmail = p.NotifWeaknessEmail.Value;
        if (p.NotifWeaknessInApp.HasValue) s.NotifWeaknessInApp = p.NotifWeaknessInApp.Value;
        if (p.NotifBadgeEmail.HasValue) s.NotifBadgeEmail = p.NotifBadgeEmail.Value;
        if (p.NotifBadgeInApp.HasValue) s.NotifBadgeInApp = p.NotifBadgeInApp.Value;
        if (p.NotifSecurityEmail.HasValue) s.NotifSecurityEmail = p.NotifSecurityEmail.Value;
        if (p.NotifSecurityInApp.HasValue) s.NotifSecurityInApp = p.NotifSecurityInApp.Value;
        if (p.ProfileDiscoverable.HasValue) s.ProfileDiscoverable = p.ProfileDiscoverable.Value;
        if (p.PublicCvDefault.HasValue) s.PublicCvDefault = p.PublicCvDefault.Value;
        if (p.ShowInLeaderboard.HasValue) s.ShowInLeaderboard = p.ShowInLeaderboard.Value;
    }

    private static UserSettingsDto ToDto(Domain.Users.UserSettings s) => new(
        s.NotifSubmissionEmail,
        s.NotifSubmissionInApp,
        s.NotifAuditEmail,
        s.NotifAuditInApp,
        s.NotifWeaknessEmail,
        s.NotifWeaknessInApp,
        s.NotifBadgeEmail,
        s.NotifBadgeInApp,
        s.NotifSecurityEmail,
        s.NotifSecurityInApp,
        s.ProfileDiscoverable,
        s.PublicCvDefault,
        s.ShowInLeaderboard,
        s.CreatedAt,
        s.UpdatedAt);
}
