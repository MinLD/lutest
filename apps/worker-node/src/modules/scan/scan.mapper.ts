import type {
  ProjectSummary,
  ScanIssue,
  ScanResponse,
} from "@lutest/contracts";

const toScanStatus = (issues: ScanIssue[]): ScanResponse["status"] => {
  if (issues.some((issue) => issue.severity === "critical")) return "failed";
  if (issues.length > 0) return "warning";
  return "passed";
};
export const scanMapper = {
  toScanStatus,
  toScanResponse: (input: any): ScanResponse => ({
    ...input,
    status: toScanStatus(input.issues),
  }),
};
