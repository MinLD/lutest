import assert from "node:assert/strict";
import { runtimeScreenshotUrl } from "./api-client";
import { runtimeOverlayEdgeMarker, runtimeOverlayRect, runtimeScreenshotMissingLabel } from "./runtime-screenshot-overlay";

const opaqueRef = "shot_0123456789abcdef0123456789abcdef";
const screenshotUrl = runtimeScreenshotUrl(opaqueRef);
assert(screenshotUrl?.endsWith(`/api/report/runtime/screenshot?ref=${opaqueRef}`), "opaque screenshot ref builds endpoint URL");
assert(!screenshotUrl?.includes(".lutest"), "screenshot URL excludes raw artifact path");
assert.equal(runtimeScreenshotUrl("../secret.png"), undefined, "traversal ref rejected");
assert.equal(runtimeScreenshotUrl("/home/user/secret.png"), undefined, "absolute ref rejected");
assert.equal(runtimeScreenshotUrl(".lutest/runtime/secret.png"), undefined, "raw lutest ref rejected");
assert.equal(runtimeScreenshotUrl("shot_short"), undefined, "malformed opaque ref rejected");

const viewport = { width: 390, height: 844 };
const naturalSize = { width: 780, height: 2400 };
const primary = runtimeOverlayRect({ x: 39, y: 120, width: 78, height: 240, top: 120, right: 117, bottom: 360, left: 39 }, viewport, naturalSize);
assert.deepEqual(primary, { leftPercent: 10, topPercent: 14.218009, widthPercent: 20, heightPercent: 28.436019 }, "viewport-focused screenshot scaling uses natural size and viewport ratio");
if (primary) {
  assert.equal((primary.leftPercent / 100) * 390, 39, "overlay scales to first rendered width");
  assert.equal((primary.leftPercent / 100) * 195, 19.5, "overlay remains aligned after resize");
}
const related = runtimeOverlayRect({ x: 195, y: 600, width: 39, height: 120, top: 600, right: 234, bottom: 720, left: 195 }, viewport, naturalSize);
assert.deepEqual(related, { leftPercent: 50, topPercent: 71.090047, widthPercent: 10, heightPercent: 14.218009 }, "related bounding box scales independently");
assert.equal(runtimeOverlayRect(undefined, viewport, naturalSize), undefined, "missing bounding box is safe");
assert.equal(runtimeOverlayRect({ x: 900, y: 0, width: 10, height: 10, top: 0, right: 910, bottom: 10, left: 900 }, viewport, naturalSize), undefined, "off-image bounding box is safe");
assert.deepEqual(runtimeOverlayEdgeMarker({ x: -85, y: 639, width: 50, height: 105, top: 639, right: -35, bottom: 744, left: -85 }, viewport, naturalSize), { side: "left", positionPercent: 81.93128, distancePx: 35, xPercent: 1, yPercent: 81.93128 }, "off-image left issue gets visible edge marker");
assert.equal(runtimeOverlayEdgeMarker({ x: 39, y: 120, width: 78, height: 240, top: 120, right: 117, bottom: 360, left: 39 }, viewport, naturalSize), undefined, "visible box does not get edge marker");

assert.equal(runtimeScreenshotMissingLabel("not-captured"), "Screenshot was not captured for this viewport.");
assert.equal(runtimeScreenshotMissingLabel("capture-failed"), "Screenshot capture failed.");
assert.equal(runtimeScreenshotMissingLabel("artifact-missing"), "Screenshot artifact is missing.");
assert.equal(runtimeScreenshotMissingLabel("artifact-invalid"), "Screenshot artifact is invalid.");

console.log("runtime screenshot overlay self-check passed");
