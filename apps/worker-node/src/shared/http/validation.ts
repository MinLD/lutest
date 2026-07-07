import type { ValidationResult } from "@lutest/contracts";
import { HttpError } from "../errors/http-error";

export const assertValid = <T>(result: ValidationResult<T>): T => {
  if (!result.ok) {
    throw new HttpError(400, result.code, result.message, result.details);
  }

  return result.value;
};