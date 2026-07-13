import type {
  GraphResponse,
  LatestReportResponse,
  ProductionGraphResponse,
  ProjectSummary,
  RuntimeArtifactDetailResponse,
  ScanRequest,
  ScanResponse,
  StatusResponse,
} from "@lutest/contracts";
import {
  validateProductionGraphResponse,
  validateRuntimeArtifactDetailResponse,
  validateRuntimeArtifactScreenshotQuery,
} from "@lutest/contracts";
import { getInitialRuntimeConfig, getRuntimeConfig } from "./lutest-runtime-config";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function getWorkerUrl() {
  return (await getRuntimeConfig()).workerUrl;
}

function withProjectPath(path: string, projectPath?: string) {
  if (!projectPath) return path;

  const params = new URLSearchParams({ path: projectPath });
  return `${path}?${params.toString()}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const workerUrl = await getWorkerUrl();
  const response = await fetch(`${workerUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed: ${response.status} ${response.statusText}`;
    const body = await response.json().catch(() => null);
    const apiError = isApiErrorBody(body) ? body.error : null;
    throw new ApiClientError(
      apiError?.message ?? fallbackMessage,
      response.status,
      apiError?.code,
    );
  }

  return response.json() as Promise<T>;
}

export function runtimeScreenshotUrl(ref: string | undefined): string | undefined {
  const validation = validateRuntimeArtifactScreenshotQuery({ ref });
  if (!validation.ok) return undefined;
  const params = new URLSearchParams({ ref: validation.value.ref });
  return `${getInitialRuntimeConfig().workerUrl}/api/report/runtime/screenshot?${params.toString()}`;
}

function isApiErrorBody(input: unknown): input is {
  error: { code: string; message: string };
} {
  if (!input || typeof input !== "object" || !("error" in input)) {
    return false;
  }
  const error = (input as { error?: unknown }).error;
  return (
    !!error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export function isPathNotAllowedError(cause: unknown) {
  return cause instanceof ApiClientError && cause.code === "PATH_NOT_ALLOWED";
}

async function requestProductionGraph(path: string) {
  const response = await requestJson<unknown>(path);
  const validation = validateProductionGraphResponse(response);
  if (!validation.ok) {
    throw new ApiClientError(validation.message);
  }
  return validation.value;
}

async function requestRuntimeArtifactDetail(path: string): Promise<RuntimeArtifactDetailResponse> {
  const response = await requestJson<unknown>(path);
  const validation = validateRuntimeArtifactDetailResponse(response);
  if (!validation.ok) throw new ApiClientError(validation.message);
  return validation.value;
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

  getProductionGraph(projectPath?: string): Promise<ProductionGraphResponse> {
    return requestProductionGraph(
      withProjectPath("/api/graph/production", projectPath),
    );
  },

  getLatestReport(projectPath?: string) {
    return requestJson<LatestReportResponse>(
      withProjectPath("/api/report/latest", projectPath),
    );
  },

  getLatestRuntimeArtifactDetail(projectPath?: string) {
    return requestRuntimeArtifactDetail(
      withProjectPath("/api/report/runtime/latest", projectPath),
    );
  },

  runScan(input: ScanRequest = {}) {
    return requestJson<ScanResponse>("/api/actions/scan", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
