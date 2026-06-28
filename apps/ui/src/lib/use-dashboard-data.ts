"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  GraphResponse,
  LatestReportResponse,
  ProjectSummary,
  ScanResponse,
  StatusResponse,
} from "@lutest/contracts";
import { lutestApi } from "./api-client";

export type DashboardData = {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  graph: GraphResponse | null;
  latestReport: LatestReportResponse | null;
  lastScan: ScanResponse | null;
};

const emptyDashboardData: DashboardData = {
  status: null,
  project: null,
  graph: null,
  latestReport: null,
  lastScan: null,
};

const DEFAULT_PROJECT_PATH = process.env.NEXT_PUBLIC_LUTEST_PROJECT_PATH;

export function useDashboardData(projectPath = DEFAULT_PROJECT_PATH) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [status, project, graph, latestReport] = await Promise.all([
        lutestApi.getStatus(),
        lutestApi.getProject(projectPath),
        lutestApi.getGraph(projectPath),
        lutestApi.getLatestReport(projectPath),
      ]);
      setData((current) => ({
        ...current,
        status,
        project,
        graph,
        latestReport,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    try {
      const scan = await lutestApi.runScan({ projectPath });
      const [graph, latestReport] = await Promise.all([
        lutestApi.getGraph(projectPath),
        lutestApi.getLatestReport(projectPath),
      ]);

      setData((current) => ({
        ...current,
        graph,
        latestReport,
        lastScan: scan,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to run scan");
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
  };
}
