import type { LatestReportResponse } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
import { reportRepository } from "./report.repository";

export interface GetLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const getLatestReport = async (
  input: GetLatestReportInput,
): Promise<LatestReportResponse> => {
  const result = await reportRepository.findLatest(input);

  if (result.kind === "ok") {
    return { state: "valid", report: result.report };
  }

  if (result.kind === "missing") {
    return { state: "missing", report: null };
  }

  if (result.kind === "malformed") {
    throw new HttpError(
      500,
      "REPORT_MALFORMED",
      "Latest report JSON is malformed.",
      result.error,
    );
  }

  if (result.kind === "schema-invalid") {
    throw new HttpError(
      500,
      "REPORT_SCHEMA_INVALID",
      "Latest report does not match ScanResponse schema.",
      result.details ?? result.error,
    );
  }

  if (result.kind === "permission-denied") {
    throw new HttpError(
      500,
      "REPORT_PERMISSION_DENIED",
      "Latest report cannot be read due to filesystem permissions.",
      result.error,
    );
  }

  throw new HttpError(
    500,
    "INTERNAL_ERROR",
    "Could not read latest report.",
    result.error,
  );
};

export const reportService = { getLatestReport };
