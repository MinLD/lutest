import type { Request, Response } from "express";
import { validateProjectPathQuery } from "@lutest/contracts";
import { sendPathError, sendValidationError } from "./respond";
import { pathPolicyService } from "../services/path-policy.service";

export const getValidatedProjectPath = async (
  req: Request,
  res: Response,
): Promise<string | undefined | null> => {
  const validation = validateProjectPathQuery(req.query.path);
  if (!validation.ok) {
    sendValidationError(res, validation);
    return null;
  }

  const projectPath = validation.value;
  if (!projectPath) return undefined;

  const policy = await pathPolicyService.assertProjectRoot(projectPath);
  if (!policy.ok) {
    sendPathError(res, policy.message);
    return null;
  }

  return policy.rootDir;
};
