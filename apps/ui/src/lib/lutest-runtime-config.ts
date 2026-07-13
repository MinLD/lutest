export type LutestRuntimeConfig = {
  workerUrl: string;
  runtimeBaseUrl: string;
  projectPath?: string;
};

const DEFAULT_WORKER_URL = "http://localhost:6532";
const DEFAULT_RUNTIME_BASE_URL = "http://localhost:3000";

let cachedConfig: LutestRuntimeConfig | undefined;

function cleanUrl(value: string | undefined, fallback: string): string {
  return value?.replace(/\/$/, "") || fallback;
}

function isConfig(input: unknown): input is LutestRuntimeConfig {
  if (!input || typeof input !== "object") return false;
  const candidate = input as { workerUrl?: unknown; runtimeBaseUrl?: unknown; projectPath?: unknown };
  return (
    typeof candidate.workerUrl === "string" &&
    typeof candidate.runtimeBaseUrl === "string" &&
    (candidate.projectPath === undefined || typeof candidate.projectPath === "string")
  );
}

export function getInitialRuntimeConfig(): LutestRuntimeConfig {
  if (cachedConfig) return cachedConfig;
  if (typeof window !== "undefined" && window.__LUTEST_CONFIG__) {
    cachedConfig = window.__LUTEST_CONFIG__;
    return cachedConfig;
  }
  return {
    workerUrl: cleanUrl(process.env.NEXT_PUBLIC_LUTEST_WORKER_URL, DEFAULT_WORKER_URL),
    runtimeBaseUrl: cleanUrl(process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL, DEFAULT_RUNTIME_BASE_URL),
  };
}

export async function getRuntimeConfig(): Promise<LutestRuntimeConfig> {
  if (cachedConfig) return cachedConfig;
  if (typeof window !== "undefined" && window.__LUTEST_CONFIG__) {
    cachedConfig = window.__LUTEST_CONFIG__;
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
