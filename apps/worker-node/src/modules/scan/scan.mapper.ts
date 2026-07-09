import type { ProjectSummary, RuntimeScanResult, ScanIssue, ScanResponse } from "@lutest/contracts";

const toScanStatus = (issues: ScanIssue[]): ScanResponse["status"] => {
  if (issues.some((issue) => issue.severity === "error")) return "failed";
  if (issues.length > 0) return "warning";
  return "passed";
};
export const scanMapper = {
  toScanStatus,
  toScanResponse: (input: {
    scanId: string;
    startedAt: string;
    finishedAt: string;
    project: ProjectSummary;
    sourceFileCount: number;
    issues: ScanIssue[];
    reportPath: string;
    runtimeScan?: RuntimeScanResult;
  }): ScanResponse => ({
    ...input,
    status: toScanStatus(input.issues),
  }),
};
