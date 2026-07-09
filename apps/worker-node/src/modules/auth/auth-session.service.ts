import { chromium, type Browser, type BrowserContext } from "playwright";
import type { AuthStartRequest, AuthStartResponse } from "@lutest/contracts";
import { PlaywrightBrowserPreflightError, assertPlaywrightBrowserPreflight } from "../runtime-scan/playwright-browser-preflight";
import { saveAuthStorageState } from "./auth-state.repository";

export class AuthSessionError extends Error { constructor(readonly code: "AUTH_SESSION_START_FAILED" | "AUTH_SESSION_TIMEOUT", message: string) { super(message); this.name = "AuthSessionError"; } }
export type ManualAuthSessionRunner = (input: { projectRoot: string; request: AuthStartRequest }) => Promise<AuthStartResponse>;

const defaultTimeout = 120_000;
export const runPlaywrightManualAuthSession: ManualAuthSessionRunner = async ({ projectRoot, request }) => {
  let browser: Browser | null = null; let context: BrowserContext | null = null;
  try {
    await assertPlaywrightBrowserPreflight();
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(request.baseUrl, { waitUntil: "load", timeout: Math.min(request.timeoutMs ?? defaultTimeout, 60_000) });
    const timeoutMs = request.timeoutMs ?? defaultTimeout;
    if (request.successSelector) await page.waitForSelector(request.successSelector, { timeout: timeoutMs });
    else if (request.successUrlIncludes) await page.waitForURL((url) => url.href.includes(request.successUrlIncludes ?? ""), { timeout: timeoutMs });
    else await page.waitForTimeout(Math.min(timeoutMs, 5_000));
    const state = await context.storageState();
    const authState = await saveAuthStorageState(projectRoot, state);
    return { status: "saved", authState };
  } catch (error) {
    if (error instanceof PlaywrightBrowserPreflightError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("timeout")) return { status: "timeout", error: { code: "AUTH_SESSION_TIMEOUT", message: "Auth session timed out." } };
    throw new AuthSessionError("AUTH_SESSION_START_FAILED", "Auth session could not be started.");
  } finally { await context?.close().catch(() => undefined); await browser?.close().catch(() => undefined); }
};
let runner: ManualAuthSessionRunner = runPlaywrightManualAuthSession;
export const setManualAuthSessionRunnerForTest = (next: ManualAuthSessionRunner) => { const previous = runner; runner = next; return () => { runner = previous; }; };
export const startManualAuthSession = (input: { projectRoot: string; request: AuthStartRequest }) => runner(input);
