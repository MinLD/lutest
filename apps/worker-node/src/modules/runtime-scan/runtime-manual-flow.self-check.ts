import assert from "node:assert/strict";
import { chromium } from "playwright";
import { redactRuntimeTarget, runManualFlowSteps } from "./runtime-manual-flow";

const main = async () => {
  const oldSecret = process.env.LUTEST_RUNTIME_FLOW_SECRET;
  process.env.LUTEST_RUNTIME_FLOW_SECRET = "EnvSecretValue";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.setContent(`<!doctype html><button id="open">Open</button><button id="delete-account">Delete</button><input id="name" /><input id="env" /><div id="done" hidden>Done</div><script>
      document.querySelector('#open').addEventListener('click', () => document.querySelector('#done').hidden = false);
    </script>`);
    await page.waitForSelector("#open");
    const results = await runManualFlowSteps({
      page,
      routeUrl: (route) => `http://127.0.0.1${route}`,
      timeoutMs: 5_000,
      steps: [
        { kind: "click", selector: "#open" },
        { kind: "fill", selector: "#name", value: "DirectSecretValue" },
        { kind: "fill", selector: "#env", valueFromEnv: "LUTEST_RUNTIME_FLOW_SECRET" },
        { kind: "waitForSelector", selector: "#done:not([hidden])" },
        { kind: "waitForTimeout", timeoutMs: 1 },
        { kind: "screenshotMarker", label: "opened" },
      ],
    });
    assert.deepEqual(results.map((result) => result.status), ["passed", "passed", "passed", "passed", "passed", "passed"]);
    assert.equal(await page.locator("#name").inputValue(), "DirectSecretValue");
    assert.equal(await page.locator("#env").inputValue(), "EnvSecretValue");
    const serializedResults = JSON.stringify(results);
    assert(!serializedResults.includes("DirectSecretValue"));
    assert(!serializedResults.includes("EnvSecretValue"));
    assert(results.filter((result) => result.kind === "fill").every((result) => result.redacted === true));
    assert(results.some((result) => result.kind === "fill" && result.valueSource === "env" && result.valueFromEnv === "LUTEST_RUNTIME_FLOW_SECRET"));

    const missing = await runManualFlowSteps({
      page,
      routeUrl: (route) => `http://127.0.0.1${route}`,
      timeoutMs: 100,
      steps: [{ kind: "fill", selector: "#env", valueFromEnv: "LUTEST_RUNTIME_FLOW_SECRET_MISSING" }],
    });
    assert.equal(missing[0]?.status, "failed");
    assert.equal(missing[0]?.code, "RUNTIME_FLOW_ENV_VALUE_MISSING");
    assert(!JSON.stringify(missing).includes("EnvSecretValue"));

    const blocked = await runManualFlowSteps({
      page,
      routeUrl: (route) => `http://127.0.0.1${route}`,
      timeoutMs: 100,
      steps: [{ kind: "click", selector: "#delete-account" }],
    });
    assert.equal(blocked[0]?.code, "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED");

    const allowed = await runManualFlowSteps({
      page,
      routeUrl: (route) => `http://127.0.0.1${route}`,
      timeoutMs: 5_000,
      steps: [{ kind: "click", selector: "#delete-account", allowDestructive: true }],
    });
    assert.equal(allowed[0]?.status, "passed");

    const redactedTarget = redactRuntimeTarget({
      id: "flow:secret",
      kind: "flow",
      name: "secret",
      steps: [{ kind: "fill", selector: "#name", value: "DirectSecretValue" }],
    });
    assert(!JSON.stringify(redactedTarget).includes("DirectSecretValue"));
  } finally {
    await browser.close();
    if (oldSecret === undefined) delete process.env.LUTEST_RUNTIME_FLOW_SECRET;
    else process.env.LUTEST_RUNTIME_FLOW_SECRET = oldSecret;
  }
  console.log("runtime manual flow self-check passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
