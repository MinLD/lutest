"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  GraphResponse,
  LatestReportResponse,
  ProductionGraphResponse,
  ProjectSummary,
  ScanResponse,
  StatusResponse,
} from "@lutest/contracts";
import { isPathNotAllowedError, lutestApi } from "./api-client";
import {
  adaptProductionGraphToUiGraph,
  type UiGraphModel,
} from "./production-graph-adapter";

export type GraphMode = "legacy" | "production";

export type DashboardData = {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  graph: GraphResponse | null;
  productionGraph: ProductionGraphResponse | null;
  productionGraphView: UiGraphModel | null;
  latestReport: LatestReportResponse | null;
  lastScan: ScanResponse | null;
};

const emptyDashboardData: DashboardData = {
  status: null,
  project: null,
  graph: null,
  productionGraph: null,
  productionGraphView: null,
  latestReport: null,
  lastScan: null,
};

const DEFAULT_PROJECT_PATH = process.env.NEXT_PUBLIC_LUTEST_PROJECT_PATH;
const PATH_NOT_ALLOWED_MESSAGE = "Selected path is outside worker allowed root";
export const DEFAULT_GRAPH_MODE: GraphMode =
  process.env.NEXT_PUBLIC_LUTEST_GRAPH_MODE === "production"
    ? "production"
    : "legacy";

async function loadGraph(projectPath: string | undefined, graphMode: GraphMode) {
  if (graphMode === "production") {
    const productionGraph = await lutestApi.getProductionGraph(projectPath);
    return {
      graph: null,
      productionGraph,
      productionGraphView: adaptProductionGraphToUiGraph(productionGraph),
    };
  }

  return {
    graph: await lutestApi.getGraph(projectPath),
    productionGraph: null,
    productionGraphView: null,
  };
}

function errorMessage(cause: unknown) {
  if (isPathNotAllowedError(cause)) return PATH_NOT_ALLOWED_MESSAGE;
  return cause instanceof Error ? cause.message : "Failed to load data";
}

export function useDashboardData(
  projectPath = DEFAULT_PROJECT_PATH,
  graphMode: GraphMode = DEFAULT_GRAPH_MODE,
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
        loadGraph(selectedProjectPath, graphMode),
        lutestApi.getLatestReport(selectedProjectPath),
      ]);

      setData((current) => ({
        ...current,
        status,
        project,
        ...graphData,
        latestReport,
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [graphMode, projectPath]);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    try {
      const scan = await lutestApi.runScan({ projectPath });
      const selectedProjectPath = projectPath ?? undefined;
      const [graphData, latestReport] = await Promise.all([
        loadGraph(selectedProjectPath, graphMode),
        lutestApi.getLatestReport(selectedProjectPath),
      ]);

      setData((current) => ({
        ...current,
        ...graphData,
        latestReport,
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
  }, [graphMode, projectPath]);

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
  };
}
