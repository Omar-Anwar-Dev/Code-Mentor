using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeMentor.Api.IntegrationTests.TestHost;
using CodeMentor.Application.Auth.Contracts;
using CodeMentor.Application.Tasks.Contracts;

namespace CodeMentor.Api.IntegrationTests.Tasks;

/// <summary>
/// S3-T7 acceptance: GET /tasks with filters + pagination.
/// S3-T8 acceptance: GET /tasks/{id} returns detail or 404.
/// </summary>
public class TaskEndpointsTests : IClassFixture<CodeMentorWebApplicationFactory>
{
    private readonly HttpClient _client;

    public TaskEndpointsTests(CodeMentorWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAndGetAccessTokenAsync(string email)
    {
        var req = new RegisterRequest(email, "Strong_Pass_123!", "Task Tester", null);
        var res = await _client.PostAsJsonAsync("/api/auth/register", req);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.AccessToken;
    }

    private void Bearer(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task List_WithoutAuth_Returns401()
    {
        var res = await _client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task List_Default_Returns_PaginatedSeedTasks()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("list@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks");
        Assert.NotNull(body);
        Assert.Equal(1, body!.Page);
        Assert.Equal(20, body.Size);
        Assert.Equal(21, body.TotalCount);
        Assert.Equal(20, body.Items.Count); // 21 total, page size 20 → first page has 20
    }

    [Fact]
    public async Task List_TrackFilter_OnlyReturns_MatchingTrack()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("filter-track@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?track=Python");
        Assert.Equal(7, body!.TotalCount);
        Assert.All(body.Items, t => Assert.Equal("Python", t.Track));
    }

    [Fact]
    public async Task List_DifficultyFilter_Works()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("filter-diff@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?difficulty=1");
        Assert.All(body!.Items, t => Assert.Equal(1, t.Difficulty));
        Assert.Equal(3, body.TotalCount); // 3 D1 tasks seeded
    }

    [Fact]
    public async Task List_CategoryFilter_Works()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("filter-cat@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?category=Security");
        Assert.All(body!.Items, t => Assert.Equal("Security", t.Category));
        Assert.Equal(5, body.TotalCount);
    }

    [Fact]
    public async Task List_LanguageFilter_Works()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("filter-lang@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?language=TypeScript");
        Assert.All(body!.Items, t => Assert.Equal("TypeScript", t.ExpectedLanguage));
        Assert.Equal(7, body.TotalCount); // 7 FullStack/TS tasks
    }

    [Fact]
    public async Task List_CombinedFilters_Narrow()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("filter-combo@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>(
            "/api/tasks?track=Backend&category=Security");
        Assert.All(body!.Items, t =>
        {
            Assert.Equal("Backend", t.Track);
            Assert.Equal("Security", t.Category);
        });
    }

    [Fact]
    public async Task List_Search_MatchesTitleSubstring()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("search@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?search=FizzBuzz");
        Assert.Equal(1, body!.TotalCount);
        Assert.Contains("FizzBuzz", body.Items[0].Title);
    }

    [Fact]
    public async Task List_Pagination_SecondPage_ReturnsRemaining()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("paging@test.local"));
        var page2 = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?page=2&size=20");
        Assert.Equal(2, page2!.Page);
        Assert.Single(page2.Items); // 21 total, remainder on page 2
    }

    [Fact]
    public async Task List_UnreasonableSize_IsClampedTo100()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("clamp@test.local"));
        var body = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?size=500");
        Assert.Equal(100, body!.Size);
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("notfound@test.local"));
        var res = await _client.GetAsync($"/api/tasks/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetById_ReturnsFullDetail_WithPrerequisites()
    {
        Bearer(await RegisterAndGetAccessTokenAsync("detail@test.local"));
        var list = await _client.GetFromJsonAsync<TaskListResponse>("/api/tasks?search=FizzBuzz");
        var id = list!.Items[0].Id;

        var detail = await _client.GetFromJsonAsync<TaskDetailDto>($"/api/tasks/{id}");
        Assert.NotNull(detail);
        Assert.Equal("FizzBuzz + Pytest Intro", detail!.Title);
        Assert.Contains("## Overview", detail.Description);
        Assert.NotEmpty(detail.Prerequisites);
        Assert.True(detail.IsActive);
    }
}
