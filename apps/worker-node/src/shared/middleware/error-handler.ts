import type { ErrorRequestHandler } from "express";
import type { ApiErrorResponse } from "@lutest/contracts";
import { HttpError } from "../errors/http-error";

export const errorHandler: ErrorRequestHandler<unknown, ApiErrorResponse> = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  console.error("[Worker] Unhandled error:", error);

  res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        details:
          process.env.LUTEST_ENV === "development" ? String(error) : undefined,
      },
  });
};
