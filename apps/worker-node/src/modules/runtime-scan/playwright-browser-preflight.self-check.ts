import assert from "node:assert/strict";
import {
  classifyPlaywrightBrowserError,
  runPlaywrightBrowserPreflight,
} from "./playwright-browser-preflight";

const main = async () => {
  const missing = classifyPlaywrightBrowserError(new Error("Executable doesn't exist at /tmp/chromium. Please run: npx playwright install"));
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "PLAYWRIGHT_BROWSER_MISSING");
  assert.equal(missing.remediation, "npx playwright install chromium");
  assert(!missing.message.includes("/tmp/chromium"));

  const failed = classifyPlaywrightBrowserError(new Error("sandbox denied launch"));
  assert.equal(failed.ok, false);
  assert.equal(failed.code, "PLAYWRIGHT_BROWSER_LAUNCH_FAILED");
  assert(!failed.message.includes("sandbox denied launch"));

  const preflight = await runPlaywrightBrowserPreflight();
  if (!preflight.ok) {
    assert(preflight.code === "PLAYWRIGHT_BROWSER_MISSING" || preflight.code === "PLAYWRIGHT_BROWSER_LAUNCH_FAILED");
    assert(!preflight.message.includes("\n"));
  }

  console.log("playwright browser preflight self-check passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
