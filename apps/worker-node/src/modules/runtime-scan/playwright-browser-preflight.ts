import { chromium, type Browser } from "playwright";

export type RuntimeBrowserPreflightResult =
  | { ok: true }
  | {
      ok: false;
      code: "PLAYWRIGHT_BROWSER_MISSING" | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED";
      message: string;
      remediation?: string;
    };

export class PlaywrightBrowserPreflightError extends Error {
  readonly code: "PLAYWRIGHT_BROWSER_MISSING" | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED";
  readonly remediation?: string;

  constructor(result: Exclude<RuntimeBrowserPreflightResult, { ok: true }>) {
    super(result.message);
    this.name = "PlaywrightBrowserPreflightError";
    this.code = result.code;
    this.remediation = result.remediation;
  }
}

const PLAYWRIGHT_CHROMIUM_REMEDIATION = "npx playwright install chromium";

const getMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createPlaywrightBrowserMissingError = (): RuntimeBrowserPreflightResult => ({
  ok: false,
  code: "PLAYWRIGHT_BROWSER_MISSING",
  message: "Playwright Chromium browser is not installed.",
  remediation: PLAYWRIGHT_CHROMIUM_REMEDIATION,
});

export const classifyPlaywrightBrowserError = (error: unknown): RuntimeBrowserPreflightResult => {
  const message = getMessage(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("executable doesn't exist") ||
    lower.includes("browser has not been installed") ||
    lower.includes("playwright install")
  ) {
    return createPlaywrightBrowserMissingError();
  }

  return {
    ok: false,
    code: "PLAYWRIGHT_BROWSER_LAUNCH_FAILED",
    message: "Playwright Chromium browser failed to launch.",
  };
};

export const runPlaywrightBrowserPreflight = async (): Promise<RuntimeBrowserPreflightResult> => {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    return { ok: true };
  } catch (error) {
    return classifyPlaywrightBrowserError(error);
  } finally {
    await browser?.close().catch(() => undefined);
  }
};

export const assertPlaywrightBrowserPreflight = async (): Promise<void> => {
  const result = await runPlaywrightBrowserPreflight();
  if (!result.ok) throw new PlaywrightBrowserPreflightError(result);
};
