import assert from "node:assert/strict";
import { detectRuntimeLayoutIssues } from "./runtime-layout-issue-detector";
import type { DomGeometry } from "./runtime-scan.schema";

const viewport = { width: 320, height: 640 };

const geometry: DomGeometry = {
  viewport,
  capturedAt: "2026-01-01T00:00:00.000Z",
  elementCount: 10,
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
      internalId: "el:small-neighbor",
      tagName: "BUTTON",
      selectorHint: "#small-neighbor",
      rect: { x: 42, y: 90, width: 20, height: 20, top: 90, right: 62, bottom: 110, left: 42 },
      visibility: { display: "inline-block", visibility: "visible", opacity: 1 },
      clickable: true,
      order: 9,
    },
    {
      internalId: "el:wcag-aa-size",
      tagName: "BUTTON",
      selectorHint: "#wcag-aa-size",
      rect: { x: 220, y: 90, width: 30, height: 30, top: 90, right: 250, bottom: 120, left: 220 },
      visibility: { display: "inline-block", visibility: "visible", opacity: 1 },
      clickable: true,
      order: 10,
    },
    {
      internalId: "el:small-isolated",
      tagName: "BUTTON",
      selectorHint: "#small-isolated",
      rect: { x: 250, y: 300, width: 20, height: 20, top: 300, right: 270, bottom: 320, left: 250 },
      visibility: { display: "inline-block", visibility: "visible", opacity: 1 },
      clickable: true,
      order: 11,
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
    {
      internalId: "el:clipped-canvas-plane",
      tagName: "DIV",
      selectorHint: "div.canvas-plane",
      className: "canvas-plane",
      rect: { x: -85, y: 639, width: 50, height: 105, top: 639, right: -35, bottom: 744, left: -85 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      viewportBoundary: { horizontal: "clipped-ancestor", vertical: "clipped-ancestor" },
      clickable: false,
      order: 8,
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
  assert.equal(issues.some((issue) => issue.type === "horizontal-overflow" && issue.elementRef === "el:outside-left"), false, "fully outside element is not double-reported as overflow");
  assert.equal(issues.some((issue) => issue.elementRef === "el:clipped-canvas-plane"), false, "elements managed by a clipped coordinate space do not use viewport boundaries");
  assert.equal(issues.some((issue) => issue.type === "small-click-target" && issue.elementRef === "el:wcag-aa-size"), false, "30px target meets WCAG AA size");
  assert.equal(issues.some((issue) => issue.type === "small-click-target" && issue.elementRef === "el:small-isolated"), false, "undersized isolated target passes spacing exception");
  assert.equal(issues.find((issue) => issue.type === "small-click-target")?.evidence.threshold, "24x24 CSS px or sufficient target spacing");
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
  const nestedOverflowIssues = detectRuntimeLayoutIssues({
    scanTargetId: "route:nested",
    route: "/nested",
    viewport,
    domGeometry: {
      viewport,
      capturedAt: "2026-01-01T00:00:00.000Z",
      elementCount: 2,
      truncated: false,
      elements: [
        {
          internalId: "el:form",
          tagName: "FORM",
          selectorHint: "form",
          rect: { x: 20, y: 100, width: 340, height: 60, top: 100, right: 360, bottom: 160, left: 20 },
          visibility: { display: "flex", visibility: "visible", opacity: 1 },
          clickable: false,
          order: 1,
        },
        {
          internalId: "el:submit",
          parentInternalId: "el:form",
          tagName: "BUTTON",
          selectorHint: "button",
          rect: { x: 300, y: 100, width: 60, height: 60, top: 100, right: 360, bottom: 160, left: 300 },
          visibility: { display: "block", visibility: "visible", opacity: 1 },
          clickable: true,
          order: 2,
        },
      ],
    },
  });
  assert.equal(nestedOverflowIssues.some((issue) => issue.elementRef === "el:form"), false, "overflow ancestor sharing the same edge is deduped");
  assert.equal(nestedOverflowIssues.some((issue) => issue.elementRef === "el:submit"), true, "leaf overflow evidence is retained");
  assert.equal(detectRuntimeLayoutIssues({ scanTargetId: "route:1", route: "/", viewport }).length, 0);
  console.log("runtime layout issue detector self-check passed");
};

main();
