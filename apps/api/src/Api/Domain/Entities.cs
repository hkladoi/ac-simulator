using Microsoft.AspNetCore.Identity;

namespace AcSimulator.Api.Domain;
public sealed class ApplicationUser : IdentityUser { public DateTime CreatedAt { get; set; } = DateTime.UtcNow; }
public sealed class Project {
  public Guid Id { get; set; } = Guid.NewGuid(); public required string OwnerId { get; set; } public required string Name { get; set; }
  public string ConfigJson { get; set; } = "{\"schemaVersion\":2,\"rooms\":[],\"openings\":[],\"furniture\":[],\"acUnits\":[],\"environment\":{\"outsideTempC\":34,\"targetTempC\":24}}";
  public Guid? CurrentVersionId { get; set; } public string? ThumbnailUrl { get; set; } public long Revision { get; set; } = 1;
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime UpdatedAt { get; set; } = DateTime.UtcNow; public DateTime? DeletedAt { get; set; }
  public List<ProjectVersion> Versions { get; set; } = []; public List<Scenario> Scenarios { get; set; } = []; public List<ShareLink> ShareLinks { get; set; } = []; public List<Report> Reports { get; set; }=[];
}
public sealed class ProjectVersion { public Guid Id { get; set; }=Guid.NewGuid(); public Guid ProjectId { get; set; } public Project Project { get; set; }=null!; public int SchemaVersion { get; set; }=2; public required string ConfigJson { get; set; } public required string CreatedBy { get; set; } public DateTime CreatedAt { get; set; }=DateTime.UtcNow; public required string Reason { get; set; } }
public sealed class Scenario { public Guid Id { get; set; }=Guid.NewGuid(); public Guid ProjectId { get; set; } public Project Project { get; set; }=null!; public required string Name { get; set; } public Guid BaseVersionId { get; set; } public required string SimulationConfigJson { get; set; } public required string ResultSummaryJson { get; set; } public DateTime CreatedAt { get; set; }=DateTime.UtcNow; }
public sealed class ShareLink { public Guid Id { get; set; }=Guid.NewGuid(); public Guid ProjectId { get; set; } public Project Project { get; set; }=null!; public required string TokenHash { get; set; } public string Permission { get; set; }="read"; public DateTime? ExpiresAt { get; set; } public DateTime? RevokedAt { get; set; } public DateTime CreatedAt { get; set; }=DateTime.UtcNow; }
public sealed class Report { public Guid Id { get; set; }=Guid.NewGuid(); public Guid ProjectId { get; set; } public Project Project {get;set;}=null!; public Guid? ScenarioId { get; set; } public string Status { get; set; }="queued"; public string? FileUrl { get; set; } public string? Error { get; set; } public DateTime CreatedAt { get; set; }=DateTime.UtcNow; public DateTime? CompletedAt { get; set; } }
