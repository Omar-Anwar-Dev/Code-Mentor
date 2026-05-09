using CodeMentor.Infrastructure.Identity;
using Hangfire.Dashboard;

namespace CodeMentor.Infrastructure.Jobs;

/// <summary>
/// Gates the /hangfire dashboard so only authenticated users in the Admin role can view it.
/// </summary>
public sealed class HangfireAdminAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        var user = httpContext.User;
        return user?.Identity?.IsAuthenticated == true
               && user.IsInRole(ApplicationRoles.Admin);
    }
}
