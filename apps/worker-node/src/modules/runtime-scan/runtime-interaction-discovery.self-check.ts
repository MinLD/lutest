import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { mapInternalRuntimeScanResult } from "./runtime-public-contract-adapter";
import { runPlaywrightRuntimeScan } from "./playwright-scan.service";

const counters = new Map<string, number>();

const pageHtml = `<!doctype html>
<html><head><style>
body { font-family: sans-serif; margin: 0; }
button, [role=button], a { display: block; margin: 8px; }
[hidden] { display: none !important; }
.panel { padding: 12px; }
#tab-panel button { position: absolute; left: 800px; top: 20px; }
</style></head><body>
<button id="tab" role="tab" aria-controls="tab-panel">Details tab</button>
<button id="dropdown" aria-haspopup="menu" aria-controls="dropdown-panel">Open sort menu</button>
<button id="modal" aria-haspopup="dialog" aria-controls="modal-panel">Open details</button>
<button id="accordion" aria-expanded="false" aria-controls="accordion-panel">Expand details</button>
<button id="duplicate-one" aria-controls="duplicate-panel">Open duplicate one</button>
<button id="duplicate-two" aria-controls="duplicate-panel">Open duplicate two</button>
<button id="dashboard-reports" aria-controls="dashboard-content">Reports</button>
<button id="spa-route" aria-controls="spa-panel">Open routed panel</button>
<button id="disabled" aria-controls="disabled-panel" disabled>Open disabled</button>
<form><input required><button id="requires-input" type="button" aria-controls="required-panel">Open required panel</button></form>
<button id="delete">Delete account</button>
<button id="save">Save changes</button>
<button id="logout">Logout</button>
<button id="submit">Submit form</button>
<button id="confirm">Confirm payment</button>
<button id="payment">Pay now</button>
<a id="route-risk" href="/other">Open another route</a>
<button id="unknown">Mystery action</button>
<div id="unsupported" role="button" tabindex="0">Mystery role</div>
<button id="hidden" aria-controls="hidden-panel" hidden>Open hidden</button>
<section id="tab-panel" class="panel" hidden><button>Overflow action</button></section>
<section id="dropdown-panel" class="panel" hidden>Sort menu state</section>
<section id="modal-panel" class="panel" hidden>Modal state</section>
<section id="accordion-panel" class="panel" hidden>Accordion state</section>
<section id="duplicate-panel" class="panel" hidden>Duplicate state</section>
<section id="dashboard-content" class="panel" hidden>Reports dashboard state</section>
<script>
const record = (name) => fetch('/record?name=' + encodeURIComponent(name)).catch(() => undefined);
for (const button of document.querySelectorAll('button')) button.addEventListener('click', () => record(button.id));
for (const button of document.querySelectorAll('[aria-controls]')) button.addEventListener('click', () => {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  if (panel) panel.hidden = false;
});
document.querySelector('#spa-route').addEventListener('click', () => history.pushState({}, '', '/spa-route'));
</script></body></html>`;

const startServer = async (): Promise<{ baseUrl: string; close: () => Promise<void> }> => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/record") {
      const name = url.searchParams.get("name") ?? "unknown";
      counters.set(name, (counters.get(name) ?? 0) + 1);
      response.writeHead(204).end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(pageHtml);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};

const count = (name: string): number => counters.get(name) ?? 0;

const main = async (): Promise<void> => {
  const oldLutest = process.env.LUTEST_PROJECT_PATH;
  const allowedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-interaction-allowed-"));
  const projectRoot = path.join(allowedRoot, "project");
  await fs.mkdir(projectRoot, { recursive: true });
  process.env.LUTEST_PROJECT_PATH = allowedRoot;
  const server = await startServer();
  try {
    const result = await runPlaywrightRuntimeScan({
      projectRoot,
      baseUrl: server.baseUrl,
      routes: ["/"],
      viewport: { width: 640, height: 480 },
      headless: true,
      interactionDiscovery: { enabled: true, maxInteractionsPerRoute: 9, maxStatesPerRoute: 9, timeoutMs: 10_000 },
    });
    const states = result.routes[0]?.viewportResults ?? [];
    const baseline = states.find((state) => state.stateLabel === "baseline");
    assert(baseline);
    assert(states.some((state) => state.stateLabel?.includes("Details tab")), "safe tab state captured");
    assert(states.some((state) => state.stateLabel?.includes("Open sort menu")), "safe dropdown state captured");
    assert(states.some((state) => state.stateLabel?.includes("Open details")), "safe modal state captured");
    assert(states.some((state) => state.stateLabel?.includes("Expand details")), "safe accordion state captured");
    assert(states.some((state) => state.stateLabel?.includes("Reports")), "semantic SPA dashboard state captured");
    assert(states.some((state) => state.layoutIssues.length > 0), "layout issues run on discovered states");
    assert(baseline.skippedInteractions?.some((item) => item.reason === "disabled"));
    assert(baseline.skippedInteractions?.some((item) => item.reason === "requires-input"));
    assert(baseline.skippedInteractions?.some((item) => item.reason === "destructive"));
    assert(baseline.skippedInteractions?.some((item) => item.reason === "unsafe-candidate"));
    assert(baseline.skippedInteractions?.some((item) => item.reason === "route-change-risk"));
    assert(baseline.skippedInteractions?.some((item) => item.label === "Open routed panel" && item.reason === "route-change-risk"), "SPA route change blocked and typed");
    assert(baseline.skippedInteractions?.some((item) => item.reason === "not-visible"));
    assert(baseline.skippedInteractions?.some((item) => item.reason === "unsupported-control"));
    assert(baseline.skippedInteractions?.some((item) => item.reason === "duplicate-state"), "duplicate state typed skip recorded");
    for (const safe of ["tab", "dropdown", "modal", "accordion", "duplicate-one", "duplicate-two", "dashboard-reports"]) assert(count(safe) > 0, `${safe} clicked`);
    assert(count("spa-route") > 0, "SPA route handler evaluated under navigation guard");
    for (const unsafe of ["disabled", "requires-input", "delete", "save", "logout", "submit", "confirm", "payment", "unknown", "hidden"]) assert.equal(count(unsafe), 0, `${unsafe} not clicked`);

    const uniqueIssueIds = new Set(states.flatMap((state) => state.layoutIssues.map((issue) => issue.id)));
    assert.equal(uniqueIssueIds.size, states.reduce((sum, state) => sum + state.layoutIssues.length, 0), "issues deduped across states");
    const publicResult = mapInternalRuntimeScanResult(result);
    const publicJson = JSON.stringify(publicResult);
    assert(!publicJson.includes(projectRoot));
    assert(!publicJson.includes(".lutest"));
    assert(!/(cookie|token|password|storageState|localStorage|sessionStorage)\s*[:=]/i.test(publicJson));
    assert(!publicJson.includes("\n    at "));

    const limited = await runPlaywrightRuntimeScan({
      projectRoot,
      baseUrl: server.baseUrl,
      routes: ["/"],
      viewport: { width: 640, height: 480 },
      headless: true,
      interactionDiscovery: { enabled: true, maxInteractionsPerRoute: 1, maxStatesPerRoute: 2, timeoutMs: 10_000 },
    });
    const limitedBaseline = limited.routes[0]?.viewportResults[0];
    assert(limited.routes[0]?.viewportResults.length <= 2, "max states enforced");
    assert(limitedBaseline?.skippedInteractions?.some((item) => item.reason === "limit-reached"), "interaction/state limit typed skip recorded");

    const timed = await runPlaywrightRuntimeScan({
      projectRoot,
      baseUrl: server.baseUrl,
      routes: ["/"],
      viewport: { width: 640, height: 480 },
      headless: true,
      interactionDiscovery: { enabled: true, maxInteractionsPerRoute: 8, maxStatesPerRoute: 8, timeoutMs: 1 },
    });
    assert(timed.routes[0]?.viewportResults[0]?.skippedInteractions?.some((item) => item.reason === "limit-reached"), "discovery timeout enforced deterministically");
  } finally {
    await server.close();
    if (oldLutest === undefined) delete process.env.LUTEST_PROJECT_PATH;
    else process.env.LUTEST_PROJECT_PATH = oldLutest;
    await fs.rm(allowedRoot, { recursive: true, force: true });
  }
};

main()
  .then(() => console.log("runtime interaction discovery self-check passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
