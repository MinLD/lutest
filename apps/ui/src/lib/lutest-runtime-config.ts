export type LutestRuntimeConfig = {
  workerUrl: string;
  runtimeBaseUrl: string;
  projectPath?: string;
  chromiumStatus: "ok" | "missing" | "unknown";
};

const DEFAULT_WORKER_URL = "http://localhost:6532";
const DEFAULT_RUNTIME_BASE_URL = "http://localhost:3000";

let cachedConfig: LutestRuntimeConfig | undefined;

type RuntimeConfigPayload = {
  workerUrl: string;
  runtimeBaseUrl: string;
  projectPath?: string;
  chromiumStatus?: unknown;
};

function cleanUrl(value: string | undefined, fallback: string): string {
  return value?.replace(/\/$/, "") || fallback;
}

export function normalizeChromiumStatus(value: unknown): LutestRuntimeConfig["chromiumStatus"] {
  return value === "ok" || value === "missing" ? value : "unknown";
}

function isConfig(input: unknown): input is RuntimeConfigPayload {
  if (!input || typeof input !== "object") return false;
  const candidate = input as { workerUrl?: unknown; runtimeBaseUrl?: unknown; projectPath?: unknown; chromiumStatus?: unknown };
  return (
    typeof candidate.workerUrl === "string" &&
    typeof candidate.runtimeBaseUrl === "string" &&
    (candidate.projectPath === undefined || typeof candidate.projectPath === "string") &&
    (candidate.chromiumStatus === undefined || candidate.chromiumStatus === "ok" || candidate.chromiumStatus === "missing" || candidate.chromiumStatus === "unknown")
  );
}

export function getInitialRuntimeConfig(): LutestRuntimeConfig {
  if (cachedConfig) return cachedConfig;
  if (typeof window !== "undefined" && window.__LUTEST_CONFIG__) {
    cachedConfig = {
      ...window.__LUTEST_CONFIG__,
      chromiumStatus: normalizeChromiumStatus(window.__LUTEST_CONFIG__.chromiumStatus),
    };
    return cachedConfig;
  }
  return {
    workerUrl: cleanUrl(process.env.NEXT_PUBLIC_LUTEST_WORKER_URL, DEFAULT_WORKER_URL),
    runtimeBaseUrl: cleanUrl(process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL, DEFAULT_RUNTIME_BASE_URL),
    chromiumStatus: normalizeChromiumStatus(process.env.NEXT_PUBLIC_LUTEST_CHROMIUM_STATUS),
  };
}

export async function getRuntimeConfig(): Promise<LutestRuntimeConfig> {
  if (cachedConfig) return cachedConfig;
  if (typeof window !== "undefined" && window.__LUTEST_CONFIG__) {
    cachedConfig = {
      ...window.__LUTEST_CONFIG__,
      chromiumStatus: normalizeChromiumStatus(window.__LUTEST_CONFIG__.chromiumStatus),
    };
    return cachedConfig;
  }

  if (typeof window !== "undefined") {
    const response = await fetch("/api/lutest-config", { cache: "no-store" }).catch(() => null);
    if (response?.ok) {
      const body: unknown = await response.json().catch(() => null);
      if (isConfig(body)) {
        cachedConfig = {
          workerUrl: cleanUrl(body.workerUrl, DEFAULT_WORKER_URL),
          runtimeBaseUrl: cleanUrl(body.runtimeBaseUrl, DEFAULT_RUNTIME_BASE_URL),
          projectPath: body.projectPath,
          chromiumStatus: normalizeChromiumStatus(body.chromiumStatus),
        };
        window.__LUTEST_CONFIG__ = cachedConfig;
        return cachedConfig;
      }
    }
  }

  cachedConfig = getInitialRuntimeConfig();
  return cachedConfig;
}

declare global {
  interface Window {
    __LUTEST_CONFIG__?: LutestRuntimeConfig;
  }
}
