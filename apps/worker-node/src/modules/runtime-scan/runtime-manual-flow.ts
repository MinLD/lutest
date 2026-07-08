import type { Page } from "playwright";
import type { RuntimeFlowStep, RuntimeScanTarget } from "./runtime-scan.schema";

export type RuntimeManualStepResult = {
  kind: RuntimeFlowStep["kind"];
  selector?: string;
  status: "passed" | "failed";
  durationMs: number;
  redacted?: boolean;
  valueSource?: "direct" | "env";
  valueFromEnv?: string;
  code?: string;
  message?: string;
};

const DESTRUCTIVE_PATTERN = /delete|remove|logout|log-out|signout|sign-out|submit|save|confirm|danger|destructive/i;

export const manualTargetRoute = (target: RuntimeScanTarget): string =>
  target.kind === "route" ? target.route : target.route ?? "/";

export const manualTargetSteps = (target: RuntimeScanTarget): RuntimeFlowStep[] =>
  target.kind === "route" ? [] : target.steps ?? [];

export const redactRuntimeTarget = (target: RuntimeScanTarget): RuntimeScanTarget => {
  if (target.kind === "route") return target;
  return {
    ...target,
    steps: (target.steps ?? []).map((step) => step.kind === "fill"
      ? { kind: "fill", selector: step.selector, valueFromEnv: step.valueFromEnv }
      : step),
  };
};

const selector = (step: RuntimeFlowStep): string | undefined =>
  "selector" in step ? step.selector : undefined;

const fillValue = (step: Extract<RuntimeFlowStep, { kind: "fill" }>): { value?: string; code?: string; valueSource: "direct" | "env" } => {
  if (step.valueFromEnv) {
    const value = process.env[step.valueFromEnv];
    if (value === undefined) return { code: "RUNTIME_FLOW_ENV_VALUE_MISSING", valueSource: "env" };
    return { value, valueSource: "env" };
  }
  return { value: step.value ?? "", valueSource: "direct" };
};

const blocksDestructiveClick = (step: Extract<RuntimeFlowStep, { kind: "click" }>): boolean =>
  !step.allowDestructive && DESTRUCTIVE_PATTERN.test(step.selector);

export const runManualFlowSteps = async (input: {
  page: Page;
  steps: RuntimeFlowStep[];
  routeUrl: (route: string) => string;
  timeoutMs: number;
}): Promise<RuntimeManualStepResult[]> => {
  const results: RuntimeManualStepResult[] = [];
  for (const step of input.steps) {
    const started = Date.now();
    const base = { kind: step.kind, selector: selector(step), durationMs: 0 };
    try {
      if (step.kind === "goto") await input.page.goto(input.routeUrl(step.route), { waitUntil: "load", timeout: input.timeoutMs });
      else if (step.kind === "click") {
        if (blocksDestructiveClick(step)) {
          results.push({ ...base, status: "failed", durationMs: Date.now() - started, code: "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED", message: "Destructive manual click blocked" });
          break;
        }
        await input.page.locator(step.selector).click({ timeout: input.timeoutMs });
      } else if (step.kind === "fill") {
        const resolved = fillValue(step);
        if (resolved.code || resolved.value === undefined) {
          results.push({ ...base, status: "failed", durationMs: Date.now() - started, redacted: true, valueSource: resolved.valueSource, valueFromEnv: step.valueFromEnv, code: resolved.code, message: "Manual flow fill value missing" });
          break;
        }
        await input.page.locator(step.selector).fill(resolved.value, { timeout: input.timeoutMs });
        results.push({ ...base, status: "passed", durationMs: Date.now() - started, redacted: true, valueSource: resolved.valueSource, valueFromEnv: step.valueFromEnv });
        continue;
      } else if (step.kind === "waitForSelector") await input.page.waitForSelector(step.selector, { timeout: input.timeoutMs });
      else if (step.kind === "waitForTimeout") await input.page.waitForTimeout(Math.max(0, Math.min(step.timeoutMs, input.timeoutMs)));
      results.push({ ...base, status: "passed", durationMs: Date.now() - started });
    } catch (error) {
      results.push({ ...base, status: "failed", durationMs: Date.now() - started, code: "RUNTIME_FLOW_STEP_FAILED", message: error instanceof Error ? error.message : String(error) });
      break;
    }
  }
  return results;
};
