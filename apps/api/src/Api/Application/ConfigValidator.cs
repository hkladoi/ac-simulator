using System.Text.Json;
namespace AcSimulator.Api.Application;
public static class ConfigValidator {
  public const int MaxBytes=2_000_000;
  public static bool TryValidate(string json,out string error) { error=""; if(System.Text.Encoding.UTF8.GetByteCount(json)>MaxBytes){error="Project configuration exceeds 2 MB.";return false;} try { using var doc=JsonDocument.Parse(json,new JsonDocumentOptions{MaxDepth=32});var root=doc.RootElement;if(!root.TryGetProperty("schemaVersion",out var schema)||schema.GetInt32()!=2){error="Unsupported schemaVersion.";return false;}if(!root.TryGetProperty("rooms",out var rooms)||rooms.ValueKind!=JsonValueKind.Array||rooms.GetArrayLength()>6){error="rooms must be an array with at most six items.";return false;}return true;}catch(JsonException){error="Configuration is not valid JSON.";return false;} }
}
