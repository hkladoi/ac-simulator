using AcSimulator.Api.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AcSimulator.Api.Infrastructure;
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<ApplicationUser>(options) {
  public DbSet<Project> Projects => Set<Project>(); public DbSet<ProjectVersion> ProjectVersions => Set<ProjectVersion>(); public DbSet<Scenario> Scenarios => Set<Scenario>(); public DbSet<ShareLink> ShareLinks => Set<ShareLink>(); public DbSet<Report> Reports => Set<Report>();
  protected override void OnModelCreating(ModelBuilder b) { base.OnModelCreating(b);
    b.Entity<Project>().HasQueryFilter(x=>x.DeletedAt==null); b.Entity<ProjectVersion>().HasQueryFilter(x=>x.Project.DeletedAt==null); b.Entity<Scenario>().HasQueryFilter(x=>x.Project.DeletedAt==null); b.Entity<ShareLink>().HasQueryFilter(x=>x.Project.DeletedAt==null); b.Entity<Report>().HasQueryFilter(x=>x.Project.DeletedAt==null); b.Entity<Project>().HasIndex(x=>new{x.OwnerId,x.UpdatedAt}); b.Entity<Project>().Property(x=>x.Name).HasMaxLength(120);
    b.Entity<ProjectVersion>().HasIndex(x=>new{x.ProjectId,x.CreatedAt}); b.Entity<Scenario>().HasIndex(x=>new{x.ProjectId,x.CreatedAt}); b.Entity<ShareLink>().HasIndex(x=>x.TokenHash).IsUnique(); b.Entity<Report>().HasIndex(x=>new{x.ProjectId,x.CreatedAt});
    b.Entity<Project>().HasMany(x=>x.Versions).WithOne(x=>x.Project).HasForeignKey(x=>x.ProjectId).OnDelete(DeleteBehavior.Cascade);
    b.Entity<Project>().HasMany(x=>x.Scenarios).WithOne(x=>x.Project).HasForeignKey(x=>x.ProjectId).OnDelete(DeleteBehavior.Cascade);
    b.Entity<Project>().HasMany(x=>x.ShareLinks).WithOne(x=>x.Project).HasForeignKey(x=>x.ProjectId).OnDelete(DeleteBehavior.Cascade);
    b.Entity<Project>().HasMany(x=>x.Reports).WithOne(x=>x.Project).HasForeignKey(x=>x.ProjectId).OnDelete(DeleteBehavior.Cascade);
  }
}
