import assert from "node:assert/strict";
import { DEFAULT_RUNTIME_VIEWPORT_MATRIX, resolveRuntimeScanViewports, viewportSlug } from "./runtime-scan-viewports";

const main = () => {
  assert.deepEqual(DEFAULT_RUNTIME_VIEWPORT_MATRIX.map(viewportSlug), [
    "mobile-390x844",
    "tablet-768x1024",
    "desktop-1440x900",
  ]);
  assert.equal(resolveRuntimeScanViewports().length, 3);
  assert.deepEqual(resolveRuntimeScanViewports({ width: 640, height: 480 }).map(viewportSlug), ["custom-640x480"]);
  console.log("runtime scan viewports self-check passed");
};

main();
