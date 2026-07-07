import type { Request, Response } from "express";
import {
  validateProjectPathQuery,
  type ProjectPathQuery,
  type ValidationResult,
} from "@lutest/contracts";
import { sendPathError, sendValidationError } from "./respond";
import { pathPolicyService } from "../services/path-policy.service";

type ProjectPathQueryValidator = (
  input: unknown,
) => ValidationResult<ProjectPathQuery>;

export const getValidatedProjectPath = async (
  req: Request,
  res: Response,
  validateQuery: ProjectPathQueryValidator = validateProjectPathQuery,
): Promise<string | undefined | null> => {
  const validation = validateQuery(req.query);
  if (!validation.ok) {
    sendValidationError(res, validation);
    return null;
  }

  const projectPath = validation.value.path ?? validation.value.projectPath;
  const policy = await pathPolicyService.assertProjectRoot(projectPath);
  if (!policy.ok) {
    sendPathError(res, policy.message);
    return null;
  }

  return policy.rootDir;
};
