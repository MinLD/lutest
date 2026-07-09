import type { NextFunction, Request, Response } from "express";
import { validateAuthStartRequest, validateAuthStartResponse, validateAuthStatusResponse, validateAuthClearResponse } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
import { pathPolicyService } from "../../shared/services/path-policy.service";
import { clearAuthStorageState, readAuthStatus } from "./auth-state.repository";
import { AuthSessionError, startManualAuthSession } from "./auth-session.service";
import { PlaywrightBrowserPreflightError } from "../runtime-scan/playwright-browser-preflight";

const selectedRoot = async (projectPath?: string) => { const policy = await pathPolicyService.assertProjectRoot(projectPath); if (!policy.ok) throw new HttpError(403, "PATH_NOT_ALLOWED", policy.message, policy.details); return policy.rootDir; };
const classifyValidation = (message: string): never => { if (message.includes("local HTTP(S) URL")) throw new HttpError(400, "BASE_URL_NOT_LOCAL", message); throw new HttpError(400, "CONFIG_ERROR", message); };
export const authController = {
  async start(req: Request, res: Response, next: NextFunction) { try {
    const parsed = validateAuthStartRequest(req.body); if (!parsed.ok) classifyValidation(parsed.message);
    if (!parsed.ok) return;
    const request = parsed.value;
    const projectRoot = await selectedRoot(request.projectPath);
    const response = await startManualAuthSession({ projectRoot, request });
    const validation = validateAuthStartResponse(response); if (!validation.ok) throw new HttpError(500, "INTERNAL_ERROR", validation.message);
    res.status(response.status === "timeout" ? 408 : 200).json(validation.value);
  } catch (error) {
    if (error instanceof PlaywrightBrowserPreflightError) return next(new HttpError(500, error.code, error.message, error.remediation ? { remediation: error.remediation } : undefined));
    if (error instanceof AuthSessionError) return next(new HttpError(500, error.code, error.message));
    next(error);
  } },
  async status(req: Request, res: Response, next: NextFunction) { try {
    const projectPath = typeof req.query.path === "string" ? req.query.path : typeof req.query.projectPath === "string" ? req.query.projectPath : undefined;
    const projectRoot = await selectedRoot(projectPath);
    const response = await readAuthStatus(projectRoot); const validation = validateAuthStatusResponse(response); if (!validation.ok) throw new HttpError(500, "INTERNAL_ERROR", validation.message);
    res.json(validation.value);
  } catch (error) { next(error); } },
  async clear(req: Request, res: Response, next: NextFunction) { try {
    const projectPath = req.body && typeof req.body === "object" && typeof (req.body as { projectPath?: unknown }).projectPath === "string" ? (req.body as { projectPath: string }).projectPath : undefined;
    const projectRoot = await selectedRoot(projectPath);
    const response = await clearAuthStorageState(projectRoot); const validation = validateAuthClearResponse(response); if (!validation.ok) throw new HttpError(500, "INTERNAL_ERROR", validation.message);
    res.json(validation.value);
  } catch (error) { next(error); } },
};
