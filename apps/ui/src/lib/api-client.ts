import type {
  GraphResponse,
  LatestReportResponse,
  ProjectSummary,
  ScanRequest,
  ScanResponse,
  StatusResponse,
} from "@lutest/contracts";

const DEFAULT_WORKER_URL = "http://localhost:6532";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getWorkerUrl() {
  return (
    process.env.NEXT_PUBLIC_LUTEST_WORKER_URL?.replace(/\/$/, "") ??
    DEFAULT_WORKER_URL
  );
}

function withProjectPath(path: string, projectPath?: string) {
  if (!projectPath) return path;

  const params = new URLSearchParams({ path: projectPath });
  return `${path}?${params.toString()}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getWorkerUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiClientError(
      `Request failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export const lutestApi = {
  getStatus() {
    return requestJson<StatusResponse>("/api/status");
  },

  getProject(projectPath?: string) {
    return requestJson<ProjectSummary>(
      withProjectPath("/api/project", projectPath),
    );
  },

  getGraph(projectPath?: string) {
    return requestJson<GraphResponse>(
      withProjectPath("/api/graph", projectPath),
    );
  },

  getLatestReport(projectPath?: string) {
    return requestJson<LatestReportResponse>(
      withProjectPath("/api/report/latest", projectPath),
    );
  },

  runScan(input: ScanRequest = {}) {
    return requestJson<ScanResponse>("/api/scan", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
