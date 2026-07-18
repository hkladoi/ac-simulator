export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: {
      title?: string;
      detail?: string;
      serverRevision?: number;
    },
  ) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
  }
}
export const api = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    let problem = { title: response.statusText } as ApiError["problem"];
    try {
      problem = await response.json();
    } catch {}
    throw new ApiError(response.status, problem);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
};
export type ServerProject = {
  id: string;
  name: string;
  revision: number;
  currentVersionId: string | null;
  configJson: string;
  updatedAt: string;
};
export type ServerScenario = {
  id: string;
  name: string;
  baseVersionId: string;
  simulationConfigJson: string;
  resultSummaryJson: string;
  createdAt: string;
};
export type ServerVersion = {
  id: string;
  schemaVersion: number;
  createdAt: string;
  createdBy: string;
  reason: string;
};
export type ServerShare = {
  id: string;
  permission: "read";
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};
export type ServerReport = {
  id: string;
  scenarioId: string | null;
  status: "queued" | "processing" | "succeeded" | "failed";
  fileUrl: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};
