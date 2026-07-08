import type { DomElementGeometry, DomGeometry, RuntimeLayoutIssue, RuntimeScanViewport } from "./runtime-scan.schema";

const MIN_CLICK_TARGET_SIZE = 44;
const OVERFLOW_TOLERANCE_PX = 1;
const OVERLAP_RATIO_THRESHOLD = 0.5;
const MAX_OVERLAP_ELEMENTS = 200;

type DetectInput = {
  scanTargetId: string;
  route: string;
  viewport: RuntimeScanViewport;
  domGeometry?: DomGeometry;
  screenshotPath?: string;
};

const issue = (input: DetectInput, element: DomElementGeometry, type: RuntimeLayoutIssue["type"], severity: RuntimeLayoutIssue["severity"], message: string, threshold: string, related?: {
  element: DomElementGeometry;
  overlapArea: number;
  overlapRatio: number;
}): RuntimeLayoutIssue => ({
  id: `${input.scanTargetId}:${input.viewport.width}x${input.viewport.height}:${type}:${element.internalId}`,
  type,
  code: type,
  severity,
  message,
  scanTargetId: input.scanTargetId,
  route: input.route,
  viewport: input.viewport,
  elementRef: element.internalId,
  evidence: {
    selectorHint: element.selectorHint,
    boundingBox: element.rect,
    relatedElementRef: related?.element.internalId,
    relatedSelectorHint: related?.element.selectorHint,
    relatedBoundingBox: related?.element.rect,
    overlapArea: related?.overlapArea,
    overlapRatio: related?.overlapRatio,
    viewport: input.viewport,
    screenshotPath: input.screenshotPath,
    threshold,
  },
});

const area = (element: DomElementGeometry): number => Math.max(0, element.rect.width) * Math.max(0, element.rect.height);

const overlapArea = (a: DomElementGeometry, b: DomElementGeometry): number => {
  const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
  const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
  return width * height;
};

export const detectRuntimeLayoutIssues = (input: DetectInput): RuntimeLayoutIssue[] => {
  const elements = input.domGeometry?.elements ?? [];
  const issues: RuntimeLayoutIssue[] = [];

  for (const element of elements) {
    if (element.rect.width <= 0 || element.rect.height <= 0) {
      issues.push(issue(input, element, "zero-size-visible-element", "warning", "Visible element has zero-size geometry.", "width > 0 and height > 0"));
      continue;
    }
    if (element.rect.right > input.viewport.width + OVERFLOW_TOLERANCE_PX || element.rect.left < -OVERFLOW_TOLERANCE_PX) {
      issues.push(issue(input, element, "horizontal-overflow", "error", "Element extends horizontally outside the viewport.", `left >= 0 and right <= viewport.width + ${OVERFLOW_TOLERANCE_PX}px`));
    }
    if (element.rect.right < -OVERFLOW_TOLERANCE_PX || element.rect.left > input.viewport.width + OVERFLOW_TOLERANCE_PX || element.rect.bottom < -OVERFLOW_TOLERANCE_PX) {
      issues.push(issue(input, element, "element-outside-viewport", "warning", "Element is fully outside the viewport in an unexpected direction.", `right >= -${OVERFLOW_TOLERANCE_PX}px, left <= viewport.width + ${OVERFLOW_TOLERANCE_PX}px, bottom >= -${OVERFLOW_TOLERANCE_PX}px`));
    }
    if (element.clickable && (element.rect.width < MIN_CLICK_TARGET_SIZE || element.rect.height < MIN_CLICK_TARGET_SIZE)) {
      issues.push(issue(input, element, "small-click-target", "warning", "Clickable target is smaller than the minimum comfortable touch size.", `${MIN_CLICK_TARGET_SIZE}x${MIN_CLICK_TARGET_SIZE}px`));
    }
  }

  const clickable = elements.filter((element) => element.clickable && area(element) > 0).slice(0, MAX_OVERLAP_ELEMENTS);
  for (let leftIndex = 0; leftIndex < clickable.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < clickable.length; rightIndex += 1) {
      const first = clickable[leftIndex];
      const second = clickable[rightIndex];
      if (!first || !second) continue;
      const smallerArea = Math.min(area(first), area(second));
      if (smallerArea <= 0) continue;
      const currentOverlapArea = overlapArea(first, second);
      const overlapRatio = currentOverlapArea / smallerArea;
      if (overlapRatio >= OVERLAP_RATIO_THRESHOLD) {
        issues.push(issue(input, first, "suspicious-overlap", "warning", "Clickable elements substantially overlap.", `overlap >= ${OVERLAP_RATIO_THRESHOLD * 100}% of smaller clickable element`, {
          element: second,
          overlapArea: currentOverlapArea,
          overlapRatio,
        }));
        break;
      }
    }
  }

  return issues;
};
