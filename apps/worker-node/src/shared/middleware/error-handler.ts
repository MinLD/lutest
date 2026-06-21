import type { ErrorRequestHandler } from "express";
import type { ApiErrorResponse } from "@lutest/contracts";

export const errorHandler: ErrorRequestHandler<
  unknown,
  ApiErrorResponse
> = (error, _req, res, _next) => {
  console.error("[Worker] Unhandled error:", error);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details:
        process.env.LUTEST_ENV === "development"
          ? String(error)
          : undefined,
    },
  });
};
