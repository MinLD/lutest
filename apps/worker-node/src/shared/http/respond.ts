import type { Response } from "express";
import type { ApiErrorResponse, ValidationResult } from "@lutest/contracts";

export const sendValidationError = (
  res: Response,
  result: Extract<ValidationResult<unknown>, { ok: false }>,
): void => {
  res.status(400).json({
    error: {
      code: result.code,
      message: result.message,
      details: result.details,
    },
  } satisfies ApiErrorResponse);
};

export const sendPathError = (res: Response, message: string): void => {
  res.status(403).json({
    error: {
      code: "PATH_NOT_ALLOWED",
      message,
    },
  } satisfies ApiErrorResponse);
};

export const sendInternalError = (res: Response, message: string): void => {
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  } satisfies ApiErrorResponse);
};
