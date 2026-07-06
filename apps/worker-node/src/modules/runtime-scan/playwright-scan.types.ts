export type RuntimeScanViewport = {
  width: number;
  height: number;
};

export type RuntimeScanRequest = {
  projectRoot: string;
  baseUrl: string;
  routes?: string[];
  viewport?: RuntimeScanViewport;
  headless?: boolean;
  timeoutMs?: number;
};


export type RuntimeConsoleMessage = {
  type: string;
  text: string;
  location?: string;
};

export type RuntimeNetworkError = {
  url: string;
  method: string;
  failureText?: string;
};

export type RuntimeFailedResponse = {
  url: string;
  status: number;
  statusText: string;
};

export type RuntimeRouteScanResult = {
  route: string;
  url: string;
  status?: number;
  screenshotPath?: string;
  screenshotError?: string;
  error?: string;
  consoleMessages: RuntimeConsoleMessage[];
  pageErrors: string[];
  networkErrors: RuntimeNetworkError[];
  failedResponses: RuntimeFailedResponse[];
  durationMs: number;
};

export type RuntimeScanSummary = {
  routeCount: number;
  consoleMessageCount: number;
  pageErrorCount: number;
  networkErrorCount: number;
  failedResponseCount: number;
  screenshotCount: number;
};

export type RuntimeScanArtifacts = {
  rootDir: string;
  screenshotsDir: string;
  resultPath: string;
};

export type RuntimeScanResult = {
  scanId: string;
  projectRoot: string;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  routes: RuntimeRouteScanResult[];
  summary: RuntimeScanSummary;
  artifacts: RuntimeScanArtifacts;
  routeDiscovery: {
    routes: string[];
    source: "request" | "production-graph" | "fallback";
    reason: string;
  };
};

