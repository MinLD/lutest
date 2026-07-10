"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  LatestReportResponse,
  ProductionGraphResponse,
  ProjectSummary,
  RuntimeArtifactDetailResponse,
  ScanResponse,
  StatusResponse,
} from "@lutest/contracts";
import { isPathNotAllowedError, lutestApi } from "./api-client";
import {
  adaptProductionGraphToFlowModel,
  type ProductionFlowModel,
} from "./production-graph-adapter";

export type DashboardData = {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  productionGraph: ProductionGraphResponse | null;
  productionGraphView: ProductionFlowModel | null;
  latestReport: LatestReportResponse | null;
  runtimeArtifactDetail: RuntimeArtifactDetailResponse | null;
  lastScan: ScanResponse | null;
};

const emptyDashboardData: DashboardData = {
  status: null,
  project: null,
  productionGraph: null,
  productionGraphView: null,
  latestReport: null,
  runtimeArtifactDetail: null,
  lastScan: null,
};

const DEFAULT_PROJECT_PATH = process.env.NEXT_PUBLIC_LUTEST_PROJECT_PATH;
const DEFAULT_RUNTIME_BASE_URL =
  process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL ?? "http://localhost:3000";
const PATH_NOT_ALLOWED_MESSAGE = "Selected path is outside worker allowed root";

async function loadGraph(projectPath: string | undefined) {
  const productionGraph = await lutestApi.getProductionGraph(projectPath);
  return {
    productionGraph,
    productionGraphView: adaptProductionGraphToFlowModel(productionGraph),
  };
}

async function loadRuntimeArtifactDetail(
  latestReport: LatestReportResponse,
  projectPath: string | undefined,
): Promise<RuntimeArtifactDetailResponse | null> {
  if (latestReport.state !== "valid" || !latestReport.runtimeScanSummary) return null;
  try {
    return await lutestApi.getLatestRuntimeArtifactDetail(projectPath);
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "RUNTIME_ARTIFACT_NOT_FOUND") return null;
    throw cause;
  }
}

function errorMessage(cause: unknown) {
  if (isPathNotAllowedError(cause)) return PATH_NOT_ALLOWED_MESSAGE;
  return cause instanceof Error ? cause.message : "Failed to load data";
}

export function useDashboardData(
  projectPath = DEFAULT_PROJECT_PATH,
) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await lutestApi.getStatus();
      setData((current) => ({ ...current, status }));

      const project = await lutestApi.getProject(projectPath);
      const selectedProjectPath = projectPath ?? undefined;
      const [graphData, latestReport] = await Promise.all([
        loadGraph(selectedProjectPath),
        lutestApi.getLatestReport(selectedProjectPath),
      ]);
      const runtimeArtifactDetail = await loadRuntimeArtifactDetail(latestReport, selectedProjectPath);

      setData((current) => ({
        ...current,
        status,
        project,
        ...graphData,
        latestReport,
        runtimeArtifactDetail,
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  const runScan = useCallback(async (withRuntime = false) => {
    setIsScanning(true);
    setError(null);
    try {
      const scan = await lutestApi.runScan({
        projectPath,
        ...(withRuntime
          ? {
              runtimeScan: {
                enabled: true,
                baseUrl: DEFAULT_RUNTIME_BASE_URL,
              },
            }
          : {}),
      });
      const selectedProjectPath = projectPath ?? undefined;
      const [graphData, latestReport] = await Promise.all([
        loadGraph(selectedProjectPath),
        lutestApi.getLatestReport(selectedProjectPath),
      ]);
      const runtimeArtifactDetail = await loadRuntimeArtifactDetail(latestReport, selectedProjectPath);

      setData((current) => ({
        ...current,
        ...graphData,
        latestReport,
        runtimeArtifactDetail,
        lastScan: scan,
      }));
    } catch (cause) {
      setError(
        isPathNotAllowedError(cause)
          ? PATH_NOT_ALLOWED_MESSAGE
          : cause instanceof Error
            ? cause.message
            : "Failed to run scan",
      );
    } finally {
      setIsScanning(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    isLoading,
    isScanning,
    error,
    reload: load,
    runScan,
    runRuntimeScan: () => runScan(true),
  };
}


