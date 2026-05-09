using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.Storage;
using CodeMentor.Application.Submissions.Contracts;

namespace CodeMentor.Api.IntegrationTests.Submissions;

/// <summary>
/// S4-T3 acceptance: <c>POST /api/uploads/request-url</c> returns a SAS URL
/// valid for 10 min + the blob path for the caller to pass into
/// <c>POST /api/submissions</c>.
/// </summary>
public class UploadEndpointTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly HttpClient _client;
    public UploadEndpointTests(CodeMentorWebApplicationFactory f) => _client = f.CreateClient();

    private async Task<string> RegisterAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Upload Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task RequestUrl_WithoutAuth_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/uploads/request-url",
            new RequestUploadUrlRequest("my.zip"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task RequestUrl_Authenticated_Returns_SasUrl_AndSanitizedBlobPath()
    {
        Bearer(await RegisterAsync("uploader@test.local"));

        var res = await _client.PostAsJsonAsync("/api/uploads/request-url",
            new RequestUploadUrlRequest("../../hax/evil name.zip"));
        res.EnsureSuccessStatusCode();

        var body = await res.Content.ReadFromJsonAsync<UploadUrlResponse>();
        Assert.NotNull(body);
        Assert.Equal(BlobContainers.Submissions, body!.Container);

        // Path-traversal characters scrubbed and illegal chars replaced with '_'.
        Assert.DoesNotContain("..", body.BlobPath);
        Assert.DoesNotContain(" ", body.BlobPath);

        // Format: {userId}/{yyyy-MM-dd}/{guid}-{safe-name}
        var segments = body.BlobPath.Split('/');
        Assert.Equal(3, segments.Length);
        Assert.True(Guid.TryParse(segments[0], out _), "first path segment should be a Guid");
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}$", segments[1]);
        Assert.EndsWith("evil_name.zip", segments[2]);

        // URL must include SAS signature params.
        Assert.Contains("sig=", body.UploadUrl);
        Assert.Contains("sp=", body.UploadUrl);

        // ExpiresAt is roughly 10 min from now.
        var deltaMinutes = (body.ExpiresAt - DateTimeOffset.UtcNow).TotalMinutes;
        Assert.InRange(deltaMinutes, 9, 11);
    }

    [Fact]
    public async Task RequestUrl_EmptyBody_AllocatesDefaultFileName()
    {
        Bearer(await RegisterAsync("emptybody@test.local"));

        var res = await _client.PostAsJsonAsync<RequestUploadUrlRequest?>(
            "/api/uploads/request-url", null);
        res.EnsureSuccessStatusCode();

        var body = await res.Content.ReadFromJsonAsync<UploadUrlResponse>();
        Assert.EndsWith("upload.zip", body!.BlobPath);
    }

    // ── S9-T8 / F11: per-purpose container routing ──────────────────────────

    [Fact]
    public async Task RequestUrl_PurposeAudit_RoutesTo_AuditContainer()
    {
        Bearer(await RegisterAsync("audit-uploader@test.local"));

        var res = await _client.PostAsJsonAsync("/api/uploads/request-url",
            new RequestUploadUrlRequest("project.zip", Purpose: "audit"));
        res.EnsureSuccessStatusCode();

        var body = await res.Content.ReadFromJsonAsync<UploadUrlResponse>();
        Assert.Equal(BlobContainers.Audits, body!.Container);
        Assert.EndsWith("project.zip", body.BlobPath);
    }

    [Fact]
    public async Task RequestUrl_PurposeOmitted_DefaultsTo_SubmissionsContainer()
    {
        Bearer(await RegisterAsync("default-purpose@test.local"));

        // Backwards-compat: existing callers pass no Purpose → Submissions container.
        var res = await _client.PostAsJsonAsync("/api/uploads/request-url",
            new RequestUploadUrlRequest("legacy.zip"));
        res.EnsureSuccessStatusCode();

        var body = await res.Content.ReadFromJsonAsync<UploadUrlResponse>();
        Assert.Equal(BlobContainers.Submissions, body!.Container);
    }

    [Fact]
    public async Task RequestUrl_InvalidPurpose_Returns400()
    {
        Bearer(await RegisterAsync("bad-purpose@test.local"));

        var res = await _client.PostAsJsonAsync("/api/uploads/request-url",
            new RequestUploadUrlRequest("x.zip", Purpose: "deployment"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
