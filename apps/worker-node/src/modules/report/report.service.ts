import type { LatestReportResponse } from "@lutest/contracts";
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

  if (result.state === "valid") {
    return { state: "valid", report: result.report };
  }

  if (result.state === "missing") {
    return {
      state: "missing",
      report: null,
      error: {
        code: "NOT_FOUND",
        message: result.message,
      },
    };
  }

  if (result.state === "malformed") {
    return {
      state: "malformed",
      report: null,
      error: {
        code: "SCHEMA_INVALID",
        message: "Latest report JSON is malformed",
        details: result.message,
      },
    };
  }

  if (result.state === "schema-invalid") {
    return {
      state: "schema-invalid",
      report: null,
      error: {
        code: "SCHEMA_INVALID",
        message: result.message,
        details: result.details,
      },
    };
  }

  return {
    state: "malformed",
    report: null,
    error: {
      code: "INTERNAL_ERROR",
      message: "Could not read latest report",
      details: result.message,
    },
  };
};

export const reportService = { getLatestReport };
