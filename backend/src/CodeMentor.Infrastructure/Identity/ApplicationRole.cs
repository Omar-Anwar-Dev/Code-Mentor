using Microsoft.AspNetCore.Identity;

namespace CodeMentor.Infrastructure.Identity;

public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole() { }

    public ApplicationRole(string roleName) : base(roleName) { }
}

public static class ApplicationRoles
{
    public const string Admin = "Admin";
    public const string Learner = "Learner";

    public static IReadOnlyList<string> All { get; } = new[] { Admin, Learner };
}
