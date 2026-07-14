import assert from "node:assert/strict";
import { runtimeScreenshotUrl } from "./api-client";
import { runtimeIssueGuidance, runtimeOverlayCalloutPlacement, runtimeOverlayEdgeMarker, runtimeOverlayPointMarker, runtimeOverlayRect, runtimeScreenshotMissingLabel, runtimeScreenshotProjection } from "./runtime-screenshot-overlay";

const opaqueRef = "shot_0123456789abcdef0123456789abcdef";
const screenshotUrl = runtimeScreenshotUrl(opaqueRef);
assert(screenshotUrl?.endsWith(`/api/report/runtime/screenshot?ref=${opaqueRef}`), "opaque screenshot ref builds endpoint URL");
assert(!screenshotUrl?.includes(".lutest"), "screenshot URL excludes raw artifact path");
assert.equal(runtimeScreenshotUrl("../secret.png"), undefined, "traversal ref rejected");
assert.equal(runtimeScreenshotUrl("/home/user/secret.png"), undefined, "absolute ref rejected");
assert.equal(runtimeScreenshotUrl(".lutest/runtime/secret.png"), undefined, "raw lutest ref rejected");
assert.equal(runtimeScreenshotUrl("shot_short"), undefined, "malformed opaque ref rejected");

const viewport = { width: 390, height: 844 };
const naturalSize = { width: 390, height: 2400 };
const projection = runtimeScreenshotProjection({ x: 39, y: 1200, width: 78, height: 240, top: 1200, right: 117, bottom: 1440, left: 39 }, viewport, naturalSize);
assert.deepEqual(projection, { focusTop: 898, imageWidthPercent: 100, imageTranslateYPercent: 37.416667, expandedWidth: false }, "full-height screenshot focuses around selected issue");
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
assert.deepEqual(
  runtimeIssueGuidance("element-outside-viewport", { x: -85, y: 639, width: 50, height: 105, top: 639, right: -35, bottom: 744, left: -85 }, viewport),
  {
    title: "Element is outside the left edge",
    callout: "35px beyond left edge",
    summary: "The entire element ends 35px before the visible screen begins, so it cannot appear in this screenshot.",
    impact: "Users cannot see or interact with this element unless the layout moves it back into the viewport.",
    location: "Outside left by 35px · x -85, y 639 · 50 × 105 px",
    commonCauses: ["Negative offsets", "absolute positioning", "responsive transform not constrained"],
    suggestedFixes: ["Constrain positioned elements within the viewport", "Use responsive max-width or inset values", "Verify transforms at this viewport width"],
    limitation: "No source file is guessed without source-map evidence.",
  },
  "outside issue explains direction, distance, location, and impact",
);
assert.deepEqual(runtimeOverlayCalloutPlacement({ leftPercent: 10, topPercent: 30, widthPercent: 20, heightPercent: 10 }), { vertical: "above", targetX: 20, targetY: 30, connectorStartX: 20, connectorStartY: 28 }, "callout anchors above a visible bounding box without covering it");
assert.deepEqual(runtimeOverlayCalloutPlacement({ leftPercent: 70, topPercent: 5, widthPercent: 20, heightPercent: 10 }), { vertical: "below", targetX: 80, targetY: 15, connectorStartX: 80, connectorStartY: 17 }, "top-edge target places callout below its bounding box");
assert.deepEqual(runtimeOverlayCalloutPlacement({ xPercent: 20, yPercent: 30 }), { vertical: "above", targetX: 20, targetY: 30, connectorStartX: 20, connectorStartY: 28 }, "point marker uses the same bounded callout placement");
assert.equal(runtimeIssueGuidance("small-click-target", { x: 20, y: 30, width: 18, height: 18, top: 30, right: 38, bottom: 48, left: 20 }, viewport).callout, "18 × 18px · minimum 24 × 24px", "small target callout contains measured and required size");
assert.equal(runtimeIssueGuidance("zero-size-visible-element", { x: 20, y: 30, width: 0, height: 0, top: 30, right: 20, bottom: 30, left: 20 }, viewport).title, "Visible content escapes a zero-size box", "zero-size issue has plain-language guidance");
assert.equal(runtimeIssueGuidance("suspicious-overlap", { x: 20, y: 30, width: 40, height: 30, top: 30, right: 60, bottom: 60, left: 20 }, viewport, 0.5).summary, "The related element covers about 50% of the primary clickable area.", "overlap guidance explains measured overlap");
assert.equal(runtimeIssueGuidance("low-text-contrast", { x: 20, y: 30, width: 180, height: 24, top: 30, right: 200, bottom: 54, left: 20 }, viewport).title, "Text is difficult to read against its background", "low contrast issue has plain-language guidance");
for (const issueType of ["horizontal-overflow", "small-click-target", "suspicious-overlap", "zero-size-visible-element", "element-outside-viewport", "low-text-contrast"] as const) {
  const guidance = runtimeIssueGuidance(issueType, { x: 20, y: 30, width: 40, height: 30, top: 30, right: 60, bottom: 60, left: 20 }, viewport, 0.5);
  assert(guidance.summary && guidance.impact && guidance.location, `${issueType} has evidence-grounded explanation`);
  assert(guidance.commonCauses.length > 0, `${issueType} has common causes`);
  assert(guidance.suggestedFixes.length > 0, `${issueType} has deterministic fixes`);
  assert(!/\b(auto[- ]?fix|OCR|AI)\b/i.test(`${guidance.summary} ${guidance.impact} ${guidance.suggestedFixes.join(" ")}`), `${issueType} does not promise AI/OCR/autofix`);
}
assert.equal(runtimeOverlayEdgeMarker({ x: 39, y: 120, width: 78, height: 240, top: 120, right: 117, bottom: 360, left: 39 }, viewport, naturalSize), undefined, "visible box does not get edge marker");
assert.deepEqual(runtimeOverlayPointMarker({ x: 195, y: 1320, width: 0, height: 0, top: 1320, right: 195, bottom: 1320, left: 195 }, viewport, naturalSize, projection?.focusTop), { xPercent: 50, yPercent: 50 }, "zero-size issue gets a visible point marker");
assert.deepEqual(runtimeScreenshotProjection({ x: 33, y: 995, width: 403, height: 76, top: 995, right: 436, bottom: 1071, left: 33 }, viewport, { width: 436, height: 1304 }), { focusTop: 460, imageWidthPercent: 111.794872, imageTranslateYPercent: 35.276074, expandedWidth: true }, "legacy expanded-width screenshot is cropped instead of compressed");

assert.equal(runtimeScreenshotMissingLabel("not-captured"), "Screenshot was not captured for this viewport.");
assert.equal(runtimeScreenshotMissingLabel("capture-failed"), "Screenshot capture failed.");
assert.equal(runtimeScreenshotMissingLabel("artifact-missing"), "Screenshot artifact is missing.");
assert.equal(runtimeScreenshotMissingLabel("artifact-invalid"), "Screenshot artifact is invalid.");

console.log("runtime screenshot overlay self-check passed");
