using AcSimulator.Api.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.DependencyInjection;
namespace IntegrationTests;
public sealed class ApiFactory:WebApplicationFactory<Program>{private readonly string dbName=$"api-{Guid.NewGuid()}";protected override void ConfigureWebHost(IWebHostBuilder builder){builder.UseEnvironment("Testing");builder.ConfigureServices(services=>{services.RemoveAll<DbContextOptions<AppDbContext>>();services.AddDbContext<AppDbContext>(o=>o.UseInMemoryDatabase(dbName));});}}
