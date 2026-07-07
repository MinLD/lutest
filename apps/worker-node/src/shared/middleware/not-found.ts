import type { Request, Response } from "express";
import type { ApiErrorResponse } from "@lutest/contracts";

export const notFoundHandler = (
  req: Request,
  res: Response<ApiErrorResponse>,
): void => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
};
