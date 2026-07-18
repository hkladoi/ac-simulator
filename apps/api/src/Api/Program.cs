using System.Text.Json;
using System.Threading.RateLimiting;
using AcSimulator.Api.Domain;
using AcSimulator.Api.Infrastructure;
using AcSimulator.Api.Modules;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;

var builder=WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(o=>o.Limits.MaxRequestBodySize=3_000_000);
builder.Logging.AddJsonConsole();
builder.Services.Configure<JsonOptions>(o=>o.SerializerOptions.PropertyNamingPolicy=JsonNamingPolicy.CamelCase);
builder.Services.Configure<ForwardedHeadersOptions>(o=>{o.ForwardedHeaders=ForwardedHeaders.XForwardedFor|ForwardedHeaders.XForwardedProto;o.ForwardLimit=1;o.KnownNetworks.Clear();o.KnownProxies.Clear();});
var dataProtectionKeysPath=builder.Configuration["DataProtectionKeysPath"];
if(!string.IsNullOrWhiteSpace(dataProtectionKeysPath))builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath)).SetApplicationName("AcThermalSimulator");
var connection=builder.Configuration.GetConnectionString("Default")??throw new InvalidOperationException("ConnectionStrings:Default is required");
builder.Services.AddDbContext<AppDbContext>(o=>{if(builder.Configuration["DatabaseProvider"]=="SqlServer")o.UseSqlServer(connection);else o.UseSqlite(connection);});
builder.Services.AddIdentityApiEndpoints<ApplicationUser>(o=>{o.Password.RequiredLength=10;o.Password.RequireNonAlphanumeric=true;o.User.RequireUniqueEmail=true;o.SignIn.RequireConfirmedEmail=false;}).AddEntityFrameworkStores<AppDbContext>();
builder.Services.ConfigureApplicationCookie(o=>{o.Cookie.Name=builder.Environment.IsDevelopment()?"ac_session_dev":"__Host-ac_session";o.Cookie.HttpOnly=true;o.Cookie.SecurePolicy=builder.Environment.IsDevelopment()?CookieSecurePolicy.SameAsRequest:CookieSecurePolicy.Always;o.Cookie.SameSite=Microsoft.AspNetCore.Http.SameSiteMode.Strict;o.ExpireTimeSpan=TimeSpan.FromHours(8);o.SlidingExpiration=true;});
builder.Services.AddAuthorization();builder.Services.AddProblemDetails();builder.Services.AddEndpointsApiExplorer();builder.Services.AddSwaggerGen();builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>();
builder.Services.AddCors(o=>o.AddPolicy("web",p=>p.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()??[]).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddRateLimiter(o=>{o.RejectionStatusCode=429;o.AddPolicy("standard",ctx=>RateLimitPartition.GetFixedWindowLimiter(ctx.User.Identity?.Name??ctx.Connection.RemoteIpAddress?.ToString()??"anon",_=>new FixedWindowRateLimiterOptions{PermitLimit=120,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));o.AddPolicy("sensitive",ctx=>RateLimitPartition.GetFixedWindowLimiter(ctx.User.Identity?.Name??ctx.Connection.RemoteIpAddress?.ToString()??"anon",_=>new FixedWindowRateLimiterOptions{PermitLimit=12,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));});
builder.Services.AddSingleton<ReportQueue>();builder.Services.AddHostedService<ReportWorker>();
builder.Services.AddHostedService<RetentionWorker>();
builder.Services.AddSingleton<AppMetrics>();
var app=builder.Build();
if(args.Contains("--migrate",StringComparer.OrdinalIgnoreCase)||app.Environment.IsDevelopment()){using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();await db.Database.MigrateAsync();if(args.Contains("--migrate",StringComparer.OrdinalIgnoreCase))return;}
if(app.Environment.IsDevelopment()){app.UseSwagger();app.UseSwaggerUI();}
app.UseForwardedHeaders();
app.UseExceptionHandler();
app.Use(async(ctx,next)=>{var requestId=ctx.Request.Headers["X-Request-ID"].FirstOrDefault()??ctx.TraceIdentifier;ctx.Response.Headers["X-Request-ID"]=requestId;using var scope=ctx.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RequestScope").BeginScope(new Dictionary<string,object>{{"RequestId",requestId}});await next();});
app.Use(async(ctx,next)=>{if(ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS")&&ctx.Request.Headers.Origin is { Count:>0 } origins){var origin=origins.ToString().TrimEnd('/');var sameOrigin=$"{ctx.Request.Scheme}://{ctx.Request.Host}";var allowed=builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()??[];if(!origin.Equals(sameOrigin,StringComparison.OrdinalIgnoreCase)&&!allowed.Any(x=>origin.Equals(x.TrimEnd('/'),StringComparison.OrdinalIgnoreCase))){ctx.Response.StatusCode=StatusCodes.Status403Forbidden;await ctx.Response.WriteAsJsonAsync(new{type="about:blank",title="Origin not allowed",status=403});return;}}await next();});
app.Use(async(ctx,next)=>{var started=System.Diagnostics.Stopwatch.GetTimestamp();await next();var elapsed=(long)System.Diagnostics.Stopwatch.GetElapsedTime(started).TotalMilliseconds;ctx.RequestServices.GetRequiredService<AppMetrics>().Observe(ctx.Response.StatusCode,elapsed);});
app.Use(async(ctx,next)=>{ctx.Response.Headers[HeaderNames.XContentTypeOptions]="nosniff";ctx.Response.Headers["Referrer-Policy"]="no-referrer";ctx.Response.Headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()";ctx.Response.Headers["Content-Security-Policy"]="default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'";await next();});
app.UseHttpsRedirection();app.UseCors("web");app.UseAuthentication();app.UseRateLimiter();app.UseAuthorization();
app.MapGroup("/api/auth").RequireRateLimiting("sensitive").MapIdentityApi<ApplicationUser>();
app.MapProjectEndpoints();app.MapVersionEndpoints();app.MapScenarioEndpoints();app.MapSharingEndpoints();app.MapReportEndpoints();
app.MapAccountDataEndpoints();
app.MapHealthChecks("/health/live",new(){Predicate=_=>false});app.MapHealthChecks("/health/ready");
app.MapGet("/metrics",(AppMetrics metrics)=>Results.Text(metrics.Render(),"text/plain; version=0.0.4"));
app.Run();
public partial class Program { }
