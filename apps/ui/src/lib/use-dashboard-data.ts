"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  LatestReportResponse,
  ProductionGraphResponse,
  ProjectSummary,
  RuntimeArtifactDetailResponse,
  RuntimeScanRequest,
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
  runtimeArtifactError: string | null;
  lastScan: ScanResponse | null;
};

const emptyDashboardData: DashboardData = {
  status: null,
  project: null,
  productionGraph: null,
  productionGraphView: null,
  latestReport: null,
  runtimeArtifactDetail: null,
  runtimeArtifactError: null,
  lastScan: null,
};

const PATH_NOT_ALLOWED_MESSAGE = "Selected path is outside worker allowed root";

async function loadGraph(projectPath: string | undefined) {
  const productionGraph = await lutestApi.getProductionGraph(projectPath);
  return {
    productionGraph,
    productionGraphView: adaptProductionGraphToFlowModel(productionGraph),
  };
}

export async function loadRuntimeArtifactDetail(
  latestReport: LatestReportResponse,
  projectPath: string | undefined,
  loader: (path?: string) => Promise<RuntimeArtifactDetailResponse> = lutestApi.getLatestRuntimeArtifactDetail,
): Promise<{ detail: RuntimeArtifactDetailResponse | null; error: string | null }> {
  if (latestReport.state !== "valid" || !latestReport.runtimeScanSummary) return { detail: null, error: null };
  try {
    return { detail: await loader(projectPath), error: null };
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "RUNTIME_ARTIFACT_NOT_FOUND") return { detail: null, error: null };
    return { detail: null, error: errorMessage(cause) };
  }
}

function errorMessage(cause: unknown) {
  if (isPathNotAllowedError(cause)) return PATH_NOT_ALLOWED_MESSAGE;
  return cause instanceof Error ? cause.message : "Failed to load data";
}

export function useDashboardData(
  projectPath?: string,
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
      setData((current) => ({
        ...current,
        status,
        project,
        ...graphData,
        latestReport,
        runtimeArtifactDetail: null,
        runtimeArtifactError: null,
      }));
      const runtimeArtifact = await loadRuntimeArtifactDetail(latestReport, selectedProjectPath);
      setData((current) => ({ ...current, runtimeArtifactDetail: runtimeArtifact.detail, runtimeArtifactError: runtimeArtifact.error }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  const executeScan = useCallback(async (runtimeScan?: RuntimeScanRequest) => {
    setIsScanning(true);
    setError(null);
    try {
      const scan = await lutestApi.runScan({
        projectPath,
        ...(runtimeScan ? { runtimeScan } : {}),
      });
      const selectedProjectPath = projectPath ?? undefined;
      const [graphData, latestReport] = await Promise.all([
        loadGraph(selectedProjectPath),
        lutestApi.getLatestReport(selectedProjectPath),
      ]);
      setData((current) => ({
        ...current,
        ...graphData,
        latestReport,
        runtimeArtifactDetail: null,
        runtimeArtifactError: null,
        lastScan: scan,
      }));
      const runtimeArtifact = await loadRuntimeArtifactDetail(latestReport, selectedProjectPath);
      setData((current) => ({ ...current, runtimeArtifactDetail: runtimeArtifact.detail, runtimeArtifactError: runtimeArtifact.error }));
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
  const runScan = useCallback(() => executeScan(), [executeScan]);
  const runRuntimeScan = useCallback((runtimeScan: RuntimeScanRequest) => executeScan(runtimeScan), [executeScan]);

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
    runRuntimeScan,
  };
}


