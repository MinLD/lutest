import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import type { ScanIssue } from "@lutest/contracts";
import { ruleEngine } from "../rule/rule.engine";
import { discoverRuntimeScanRoutes } from "./playwright-route-discovery";
import { runPlaywrightRuntimeScan } from "./playwright-scan.service";
import type { RuntimeInteractionSkipReason, RuntimeLayoutIssueType } from "./runtime-scan.schema";

type FixtureCatalogEntry = {
  route: string;
  title: string;
  expected: string[];
  negativeControls: string[];
};

const pngDimensions = async (filePath: string): Promise<{ width: number; height: number }> => {
  const data = await fs.readFile(filePath);
  assert(data.length >= 24 && data.subarray(1, 4).toString("ascii") === "PNG", "runtime screenshot is PNG");
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
};

const reservePort = async (): Promise<number> => {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
};

const waitForServer = async (url: string, process: ChildProcessWithoutNullStreams): Promise<void> => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Runtime fixture server exited with code ${process.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Runtime fixture production server did not become ready");
};

const stopServer = async (process: ChildProcessWithoutNullStreams): Promise<void> => {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => process.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
};

const main = async (): Promise<void> => {
  const repoRoot = process.cwd();
  const fixtureRoot = path.join(repoRoot, "fixtures", "runtime-audit-lab");
  const artifactRoot = path.join(fixtureRoot, ".lutest");
  const artifactBackup = path.join(fixtureRoot, `.lutest-self-check-backup-${process.pid}`);
  let artifactsBackedUp = false;
  let artifactIsolationReady = false;
  const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
  const buildIdPath = path.join(fixtureRoot, ".next", "BUILD_ID");
  await fs.access(buildIdPath).catch(() => {
    throw new Error("Build fixture first: npx next build fixtures/runtime-audit-lab");
  });

  const catalog = JSON.parse(await fs.readFile(path.join(fixtureRoot, "fixture-catalog.json"), "utf8")) as FixtureCatalogEntry[];
  assert(catalog.some((entry) => entry.route === "/readability" && entry.expected.includes("low-text-contrast")));

  const discovered = await discoverRuntimeScanRoutes({ projectRoot: fixtureRoot });
  for (const route of ["/layout", "/interactions", "/diagnostics", "/readability", "/static-rules"]) {
    assert(discovered.routes.includes(route), `production graph discovers ${route}`);
  }

  const staticIssues = await ruleEngine.runRules({
    projectRoot: fixtureRoot,
    sourceFiles: [
      path.join(fixtureRoot, "lib", "large-static-fixture.ts"),
      path.join(fixtureRoot, "components", "diagnostic-fixture.tsx"),
    ],
  });
  const staticTypes = new Set(staticIssues.map((issue) => issue.type));
  const expectedStaticTypes: ScanIssue["type"][] = ["large-file", "console", "todo"];
  for (const type of expectedStaticTypes) assert(staticTypes.has(type), `static fixture triggers ${type}`);

  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [nextBin, "start", fixtureRoot, "-H", "127.0.0.1", "-p", String(port)], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "pipe",
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk: Buffer) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk: Buffer) => { serverOutput += chunk.toString(); });

  const previousProjectPath = process.env.LUTEST_PROJECT_PATH;
  process.env.LUTEST_PROJECT_PATH = path.dirname(fixtureRoot);
  try {
    try {
      await fs.rename(artifactRoot, artifactBackup);
      artifactsBackedUp = true;
      artifactIsolationReady = true;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      artifactIsolationReady = true;
    }
    await waitForServer(baseUrl, server);
    const result = await runPlaywrightRuntimeScan({
      projectRoot: fixtureRoot,
      baseUrl,
      routes: ["/layout", "/interactions", "/diagnostics", "/readability"],
      headless: true,
      interactionDiscovery: { enabled: true, maxStatesPerRoute: 6, timeoutMs: 10_000 },
    });

    const layout = result.routes.find((route) => route.route === "/layout");
    assert(layout, "layout fixture scanned");
    const layoutIssues = layout.viewportResults.flatMap((viewport) => viewport.layoutIssues);
    const layoutTypes = new Set(layoutIssues.map((issue) => issue.type));
    const expectedLayoutTypes: RuntimeLayoutIssueType[] = ["horizontal-overflow", "element-outside-viewport", "small-click-target", "suspicious-overlap", "zero-size-visible-element"];
    for (const type of expectedLayoutTypes) {
      assert(layoutTypes.has(type), `runtime fixture triggers ${type}`);
    }
    assert.equal(layoutIssues.length, 18, "layout fixture emits six intended issues on each viewport");
    assert(!layoutIssues.some((issue) => issue.evidence.selectorHint === "#fixture-clipped-canvas"), "clipped transformed canvas remains a negative control");
    assert(!layoutIssues.some((issue) => issue.type === "small-click-target" && issue.evidence.selectorHint === "#fixture-small-target-negative"), "isolated 30px target remains a negative control");
    assert.equal(layoutIssues.filter((issue) => issue.evidence.selectorHint === "#fixture-outside-viewport" && issue.type === "element-outside-viewport").length, 3, "fully outside fixture has one precedence-selected issue per viewport");

    const interactions = result.routes.find((route) => route.route === "/interactions");
    assert(interactions, "interaction fixture scanned");
    for (const viewportWidth of [390, 768, 1440]) {
      const interactionStates = interactions.viewportResults.filter((result) => result.viewport.width === viewportWidth).map((result) => result.stateLabel ?? "baseline");
      for (const label of ["Details tab", "Open sort menu", "Expand metrics", "Open preview dialog"]) {
        assert(interactionStates.some((state) => state.includes(label)), `safe interaction captured ${label} at ${viewportWidth}px`);
      }
    }
    assert.equal(interactions.viewportResults.flatMap((viewport) => viewport.layoutIssues).length, 9, "discovered interaction states emit three intended issues per viewport");
    assert(!interactions.viewportResults.flatMap((viewport) => viewport.skippedInteractions ?? []).some((skipped) => skipped.reason === "limit-reached" && ["Details tab", "Open sort menu", "Expand metrics", "Open preview dialog"].includes(skipped.label ?? "")), "default interaction budget covers safe controls on every viewport");
    const baselineInteraction = interactions.viewportResults.find((viewport) => viewport.stateLabel === "baseline");
    assert.equal(baselineInteraction?.layoutIssues.length, 0, "interaction baseline has no unintended responsive geometry issue");
    const skippedReasons = new Set(interactions.viewportResults.flatMap((viewport) => viewport.skippedInteractions ?? []).map((skipped) => skipped.reason));
    const expectedSkipReasons: RuntimeInteractionSkipReason[] = ["disabled", "requires-input", "destructive", "unsafe-candidate", "route-change-risk"];
    for (const reason of expectedSkipReasons) {
      assert(skippedReasons.has(reason), `interaction fixture records ${reason}`);
    }

    const diagnostics = result.routes.find((route) => route.route === "/diagnostics");
    assert(diagnostics, "diagnostic fixture scanned");
    assert(diagnostics.consoleMessages.some((message) => message.text.includes("runtime-fixture-console")), "console warning/error captured");
    assert(diagnostics.pageErrors.some((message) => message.includes("runtime-fixture-page-error")), "page error captured");
    assert(diagnostics.failedResponses.some((response) => response.status === 503), "real failed API response captured");
    assert(diagnostics.networkErrors.length > 0, "real network failure captured");

    const readability = result.routes.find((route) => route.route === "/readability");
    assert(readability, "readability fixture scanned");
    assert(readability.viewportResults.some((viewport) => viewport.screenshotPath), "readability fixture screenshot captured");
    const readabilityIssues = readability.viewportResults.flatMap((viewport) => viewport.layoutIssues.filter((issue) => issue.type === "low-text-contrast"));
    assert.equal(readabilityIssues.length, 24, "eight intended low-contrast text elements fail on each viewport");
    for (const selector of ["#fixture-low-contrast-title", "#fixture-low-contrast-body", "#fixture-inherited-title", "#fixture-inherited-body", "#fixture-dark-title", "#fixture-dark-body", "#fixture-transparent-title", "#fixture-transparent-body"]) {
      assert.equal(readabilityIssues.filter((issue) => issue.evidence.selectorHint === selector).length, 3, `readability fixture detects ${selector} on every viewport`);
    }
    assert(!readabilityIssues.some((issue) => issue.evidence.selectorHint?.startsWith("#fixture-high-contrast")), "high contrast text remains a negative control");
    assert(readabilityIssues.every((issue) => issue.evidence.foregroundColor && issue.evidence.backgroundColor && issue.evidence.contrastRatio !== undefined && issue.evidence.requiredContrastRatio !== undefined), "readability issues include complete color evidence");
    assert(readabilityIssues.every((issue) => issue.evidence.foregroundOklch && issue.evidence.backgroundOklch && issue.evidence.oklchDelta), "readability issues include OKLCH perceptual evidence");
    assert(readabilityIssues.every((issue) => issue.evidence.suggestedForegroundColor && issue.evidence.suggestionReason), "readability issues include deterministic foreground suggestions");
    assert.equal(result.summary.screenshotCount, result.routes.flatMap((route) => route.viewportResults).length, "every captured state has screenshot evidence");
    for (const viewportResult of result.routes.flatMap((route) => route.viewportResults)) {
      assert(viewportResult.screenshotPath, "captured state includes screenshot evidence");
      const dimensions = await pngDimensions(viewportResult.screenshotPath);
      assert.equal(dimensions.width, viewportResult.viewport.width, "screenshot width stays locked to audited viewport");
      assert(dimensions.height >= viewportResult.viewport.height, "screenshot keeps full vertical evidence");
    }
  } catch (error) {
    if (serverOutput) console.error(serverOutput);
    throw error;
  } finally {
    if (previousProjectPath === undefined) delete process.env.LUTEST_PROJECT_PATH;
    else process.env.LUTEST_PROJECT_PATH = previousProjectPath;
    await stopServer(server);
    if (artifactIsolationReady) await fs.rm(artifactRoot, { recursive: true, force: true });
    if (artifactsBackedUp) await fs.rename(artifactBackup, artifactRoot);
    else if (artifactIsolationReady) await fs.rm(artifactBackup, { recursive: true, force: true });
  }
};

main()
  .then(() => console.log("runtime production fixture self-check passed"))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
