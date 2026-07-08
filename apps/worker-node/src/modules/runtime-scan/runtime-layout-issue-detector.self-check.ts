import assert from "node:assert/strict";
import { detectRuntimeLayoutIssues } from "./runtime-layout-issue-detector";
import type { DomGeometry } from "./runtime-scan.schema";

const viewport = { width: 320, height: 640 };

const geometry: DomGeometry = {
  viewport,
  capturedAt: "2026-01-01T00:00:00.000Z",
  elementCount: 5,
  truncated: false,
  elements: [
    {
      internalId: "el:overflow",
      tagName: "DIV",
      selectorHint: "#overflow",
      rect: { x: 300, y: 20, width: 80, height: 40, top: 20, right: 380, bottom: 60, left: 300 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: false,
      order: 1,
    },
    {
      internalId: "el:outside-left",
      tagName: "DIV",
      selectorHint: "#outside-left",
      rect: { x: -120, y: 20, width: 80, height: 40, top: 20, right: -40, bottom: 60, left: -120 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: false,
      order: 2,
    },
    {
      internalId: "el:below-fold",
      tagName: "DIV",
      selectorHint: "#below-fold",
      rect: { x: 10, y: 1200, width: 100, height: 100, top: 1200, right: 110, bottom: 1300, left: 10 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: false,
      order: 7,
    },
    {
      internalId: "el:small",
      tagName: "BUTTON",
      selectorHint: "#small",
      rect: { x: 20, y: 90, width: 20, height: 20, top: 90, right: 40, bottom: 110, left: 20 },
      visibility: { display: "inline-block", visibility: "visible", opacity: 1 },
      clickable: true,
      order: 3,
    },
    {
      internalId: "el:overlap-a",
      tagName: "BUTTON",
      selectorHint: "#overlap-a",
      rect: { x: 80, y: 120, width: 80, height: 80, top: 120, right: 160, bottom: 200, left: 80 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: true,
      order: 4,
    },
    {
      internalId: "el:overlap-b",
      tagName: "BUTTON",
      selectorHint: "#overlap-b",
      rect: { x: 90, y: 130, width: 80, height: 80, top: 130, right: 170, bottom: 210, left: 90 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: true,
      order: 5,
    },
    {
      internalId: "el:zero",
      tagName: "DIV",
      selectorHint: "#zero",
      rect: { x: 10, y: 10, width: 0, height: 10, top: 10, right: 10, bottom: 20, left: 10 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: false,
      order: 6,
    },
  ],
};

const main = () => {
  const issues = detectRuntimeLayoutIssues({
    scanTargetId: "route:1",
    route: "/",
    viewport,
    domGeometry: geometry,
    screenshotPath: "/tmp/screenshot.png",
  });
  const types = new Set(issues.map((issue) => issue.type));
  assert(types.has("horizontal-overflow"));
  assert(types.has("element-outside-viewport"));
  assert(types.has("small-click-target"));
  assert(types.has("suspicious-overlap"));
  assert(types.has("zero-size-visible-element"));
  assert(issues.every((issue) => issue.scanTargetId === "route:1"));
  assert(issues.every((issue) => issue.evidence.viewport.width === viewport.width));
  assert(issues.every((issue) => issue.evidence.threshold.length > 0));
  assert.equal(issues.find((issue) => issue.type === "horizontal-overflow")?.severity, "error");
  assert.equal(issues.some((issue) => issue.type === "element-outside-viewport" && issue.elementRef === "el:below-fold"), false);
  assert.equal(issues.some((issue) => issue.type === "element-outside-viewport" && issue.elementRef === "el:outside-left"), true);
  const mobileViewport = { width: 390, height: 844 };
  const belowFoldIssues = detectRuntimeLayoutIssues({
    scanTargetId: "route:mobile",
    route: "/long-page",
    viewport: mobileViewport,
    domGeometry: {
      viewport: mobileViewport,
      capturedAt: "2026-01-01T00:00:00.000Z",
      elementCount: 1,
      truncated: false,
      elements: [{
        internalId: "el:mobile-below-fold",
        tagName: "DIV",
        selectorHint: "#mobile-below-fold",
        rect: { x: 10, y: 1200, width: 100, height: 100, top: 1200, right: 110, bottom: 1300, left: 10 },
        visibility: { display: "block", visibility: "visible", opacity: 1 },
        clickable: false,
        order: 1,
      }],
    },
  });
  assert.equal(belowFoldIssues.some((issue) => issue.type === "element-outside-viewport"), false);
  const overlap = issues.find((issue) => issue.type === "suspicious-overlap");
  assert.equal(overlap?.evidence.relatedElementRef, "el:overlap-b");
  assert.equal(overlap?.evidence.relatedSelectorHint, "#overlap-b");
  assert.equal(overlap?.evidence.relatedBoundingBox?.width, 80);
  assert((overlap?.evidence.overlapArea ?? 0) > 0);
  assert((overlap?.evidence.overlapRatio ?? 0) >= 0.5);
  assert.equal(detectRuntimeLayoutIssues({ scanTargetId: "route:1", route: "/", viewport }).length, 0);
  console.log("runtime layout issue detector self-check passed");
};

main();
