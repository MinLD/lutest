import { strict as assert } from "node:assert";
import { lutestApi, isPathNotAllowedError } from "./api-client";

const requests: string[] = [];
const originalFetch = globalThis.fetch;

const validProductionGraph = {
  mode: "symbol-level",
  nodes: [],
  edges: [],
  summary: {
    fileCount: 0,
    pageCount: 0,
    componentCount: 0,
    hookCount: 0,
    apiRouteCount: 0,
    apiClientMethodCount: 0,
    externalEndpointCount: 0,
    edgeCount: 0,
  },
};

const validRuntimeDetail = {
  scanId: "scan-1",
  status: "passed",
  startedAt: "2026-07-10T00:00:00.000Z",
  finishedAt: "2026-07-10T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  summary: { targetCount: 0, viewportCount: 0, screenshotCount: 0, issueCount: 0, errorCount: 0 },
  targetResults: [],
};

async function main() {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes("path=outside")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "PATH_NOT_ALLOWED",
            message: "Project path must stay inside allowed root",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/graph/production")) {
      return Response.json(validProductionGraph);
    }

    if (url.includes("/api/report/runtime/latest")) {
      return Response.json(validRuntimeDetail);
    }

    return Response.json({ ok: true });
  }) as typeof fetch;

  await lutestApi.getProject();
  assert.equal(requests.at(-1), "http://localhost:6532/api/project");

  await lutestApi.getGraph("D:\\Projects\\lutest\\apps\\ui");
  assert.match(requests.at(-1) ?? "", /\/api\/graph\?path=D%3A%5CProjects%5Clutest%5Capps%5Cui$/);

  await lutestApi.getProductionGraph("D:\\Projects\\lutest");
  assert.match(requests.at(-1) ?? "", /\/api\/graph\/production\?path=D%3A%5CProjects%5Clutest$/);

  await lutestApi.getLatestRuntimeArtifactDetail("D:\\Projects\\lutest");
  assert.match(requests.at(-1) ?? "", /\/api\/report\/runtime\/latest\?path=D%3A%5CProjects%5Clutest$/);

  await assert.rejects(
    () => lutestApi.getGraph("outside"),
    (cause) => isPathNotAllowedError(cause),
  );

  console.log("dashboard data request self-check passed");
}

main().finally(() => {
  globalThis.fetch = originalFetch;
});
