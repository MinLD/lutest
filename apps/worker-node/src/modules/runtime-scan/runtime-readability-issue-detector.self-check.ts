import assert from "node:assert/strict";
import { contrastRatio, detectRuntimeReadabilityIssues } from "./runtime-readability-issue-detector";
import type { DomElementGeometry, DomGeometry } from "./runtime-scan.schema";

const viewport = { width: 390, height: 844 };
const element = (internalId: string, foregroundColor: string, backgroundColor: string, largeText = false, top = 10): DomElementGeometry => ({
  internalId,
  tagName: "P",
  selectorHint: `#${internalId}`,
  textSnippet: "Readable public fixture text",
  rect: { x: 10, y: top, width: 200, height: 30, top, right: 210, bottom: top + 30, left: 10 },
  visibility: { display: "block", visibility: "visible", opacity: 1 },
  textStyle: { foregroundColor, backgroundColor, fontSizePx: largeText ? 24 : 16, fontWeight: 400, largeText },
  clickable: false,
  order: 1,
});
const geometry: DomGeometry = {
  viewport,
  capturedAt: "2026-07-11T00:00:00.000Z",
  elementCount: 7,
  truncated: false,
  elements: [
    element("light-low", "#d4d9e0", "#f8fafc"),
    element("dark-low", "#343943", "#20242c"),
    element("inherited-low", "#f1c9a8", "#fff7ed"),
    element("transparent-composited-low", "#c5cad1", "#e4e7eb"),
    element("large-low", "#777777", "#999999", true),
    element("below-fold-low", "#d4d9e0", "#f8fafc", false, 1_200),
    element("high-contrast", "#ffffff", "#111827"),
  ],
};

assert.equal(Math.round((contrastRatio("#000000", "#ffffff") ?? 0) * 100) / 100, 21, "black and white contrast is 21:1");
const issues = detectRuntimeReadabilityIssues({ scanTargetId: "route:readability", route: "/readability", viewport, domGeometry: geometry, screenshotPath: "safe-internal.png" });
assert.deepEqual(issues.map((issue) => issue.elementRef), ["light-low", "dark-low", "inherited-low", "transparent-composited-low", "large-low"], "visible low contrast variants are detected while high contrast and below-viewport controls are ignored");
assert(issues.every((issue) => issue.evidence.foregroundColor?.startsWith("#") && issue.evidence.backgroundColor?.startsWith("#")), "issues include normalized color evidence");
assert(issues.every((issue) => (issue.evidence.contrastRatio ?? 99) < (issue.evidence.requiredContrastRatio ?? 0)), "each issue fails its deterministic threshold");
assert(issues.every((issue) => issue.evidence.foregroundOklch && issue.evidence.backgroundOklch && issue.evidence.oklchDelta), "valid colors include OKLCH evidence");
assert(issues.every((issue) => issue.evidence.suggestedForegroundColor && issue.evidence.suggestionReason), "failing colors include deterministic foreground suggestions");
assert.equal(issues.find((issue) => issue.elementRef === "large-low")?.evidence.requiredContrastRatio, 3, "large text uses the WCAG AA 3:1 threshold");
assert(!issues.some((issue) => issue.elementRef === "below-fold-low"), "element below viewport does not create a contrast issue");

console.log("runtime readability issue detector self-check passed");
