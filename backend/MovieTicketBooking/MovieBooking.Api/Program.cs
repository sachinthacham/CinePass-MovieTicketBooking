using MovieBooking.Api.Extensions;
using Serilog;

EnvironmentLoader.LoadDotEnv();
var builder = WebApplication.CreateBuilder(args);

builder.AddSerilogLogging();

builder.Services
    .AddApiVersioningConfig()
    .AddControllersWithEnumJson()
    .AddSwaggerWithJwt()
    .AddPersistence(builder.Configuration)
    .AddRepositories()
    .AddApplicationServices()
    .AddJwtAndSocialAuthentication(builder.Configuration)
    .AddFrontendCors(builder.Configuration)
    .AddCustomRateLimiting();

var app = builder.Build();

await app.ApplyMigrationsAndSeedAsync();

Log.Information("MovieBooking API starting up...");

app.UseRequestPipeline();

app.Run();
