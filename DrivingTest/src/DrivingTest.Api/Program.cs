using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using DrivingTest.Api.Endpoints;
using DrivingTest.Api.Extensions;
using DrivingTest.Api.Infrastructure;
using DrivingTest.Application;
using DrivingTest.Application.Common;
using DrivingTest.Domain;
using DrivingTest.Infrastructure;
using DrivingTest.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddApplication(config);
builder.Services.AddInfrastructure(config);

// ---- Lỗi & JSON ----
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// ---- Xác thực JWT (cấu hình lấy từ JwtOptions đã được validate khi khởi động) ----
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((o, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;
        o.MapInboundClaims = false; // giữ nguyên claim "sub"
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role" // claim "role" do TokenService phát hành
        };
    });
builder.Services.AddAuthorization(o =>
    o.AddPolicy("Admin", p => p.RequireRole(Roles.Admin)));

// ---- CORS ----
var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

// ---- Rate limiting: chống brute-force đăng nhập và cào đáp án ----
var rl = config.GetSection("RateLimiting").Get<RateLimitingOptions>() ?? new RateLimitingOptions();
static string ClientKey(HttpContext http)
    => http.User.GetUserId()?.ToString() ?? http.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rl.AuthPermitLimit,
            Window = TimeSpan.FromSeconds(rl.WindowSeconds),
            QueueLimit = 0
        }));
    o.AddPolicy("check", http => RateLimitPartition.GetFixedWindowLimiter(
        ClientKey(http),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rl.CheckPermitLimit,
            Window = TimeSpan.FromSeconds(rl.WindowSeconds),
            QueueLimit = 0
        }));
});

// Sau reverse proxy: cấu hình KnownProxies/KnownNetworks để RemoteIpAddress là IP thật của client.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>();

var app = builder.Build();

if (config.GetValue<bool>("Database:AutoInitialize"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<DbInitializer>().InitializeAsync();
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment()) app.MapOpenApi();
else app.UseHttpsRedirection();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter(); // sau Authentication để partition theo user

app.MapHealthChecks("/health");
app.MapAuthEndpoints();
app.MapCatalogEndpoints();
app.MapExamEndpoints();
app.MapAccountEndpoints();

app.Run();
