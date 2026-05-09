using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CodeMentor.Infrastructure.Persistence;

// Used by `dotnet ef` tooling when running migrations from the Infrastructure project directly.
// Reads connection from env var EFMIGRATIONS_CONNECTION_STRING or falls back to the dev default.
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("EFMIGRATIONS_CONNECTION_STRING")
            ?? "Server=localhost,1433;Database=CodeMentor;User Id=sa;Password=CodeMentor_Dev_123!;TrustServerCertificate=True;Encrypt=False";

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(connection, sql => sql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
            .Options;

        return new ApplicationDbContext(options);
    }
}
