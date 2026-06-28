import type { LatestReportResponse } from "@lutest/contracts";
import { reportRepository } from "./report.repository";
import { validateScanResponse } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";

export interface GetLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const getLatestReport = async (
  input: GetLatestReportInput,
): Promise<LatestReportResponse> => {
  const result = await reportRepository.findLatest(input);

  if (result.status === "missing") {
    return { report: null };
  }

  if (result.status === "malformed") {
    throw new HttpError(
      500,
      "SCHEMA_INVALID",
      "Latest report JSON is malformed",
      result.message,
    );
  }

  if (result.status === "error") {
    throw new HttpError(
      500,
      "INTERNAL_ERROR",
      "Could not read latest report",
      result.message,
    );
  }

  const validation = validateScanResponse(result.data);
  if (!validation.ok) {
    throw new HttpError(500, validation.code, validation.message);
  }

  return { report: validation.value };
};

export const reportService = { getLatestReport };
