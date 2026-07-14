import type { DomElementGeometry, DomGeometry, RuntimeLayoutIssue, RuntimeScanViewport } from "./runtime-scan.schema";

const MIN_CLICK_TARGET_SIZE = 24;
const MIN_CLICK_TARGET_RADIUS = MIN_CLICK_TARGET_SIZE / 2;
const OVERFLOW_TOLERANCE_PX = 1;
const OVERLAP_RATIO_THRESHOLD = 0.5;
const MAX_OVERLAP_ELEMENTS = 200;
const ZERO_SIZE_LAYOUT_IGNORED_TAGS = new Set(["DESC", "OPTGROUP", "OPTION", "TITLE"]);

type DetectInput = {
  scanTargetId: string;
  stateId?: string;
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
  id: `${input.scanTargetId}:${input.stateId ?? "baseline"}:${input.viewport.width}x${input.viewport.height}:${type}:${element.internalId}`,
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

const usesViewportBoundary = (element: DomElementGeometry, axis: "horizontal" | "vertical"): boolean =>
  (element.viewportBoundary?.[axis] ?? "viewport") === "viewport";

type HorizontalOverflowSide = "left" | "right";

const horizontalOverflowSides = (element: DomElementGeometry, viewport: RuntimeScanViewport): HorizontalOverflowSide[] => {
  if (!usesViewportBoundary(element, "horizontal")) return [];
  const sides: HorizontalOverflowSide[] = [];
  if (element.rect.left < -OVERFLOW_TOLERANCE_PX) sides.push("left");
  if (element.rect.right > viewport.width + OVERFLOW_TOLERANCE_PX) sides.push("right");
  return sides;
};

const isFullyOutsideViewport = (element: DomElementGeometry, viewport: RuntimeScanViewport): boolean =>
  (usesViewportBoundary(element, "horizontal") && (element.rect.right < -OVERFLOW_TOLERANCE_PX || element.rect.left > viewport.width + OVERFLOW_TOLERANCE_PX))
  || (usesViewportBoundary(element, "vertical") && element.rect.bottom < -OVERFLOW_TOLERANCE_PX);

const isIntentionalFocusRevealedControl = (element: DomElementGeometry): boolean =>
  element.clickable && element.focusBehavior?.visibleOnFocus === true;

const isDescendantOf = (
  element: DomElementGeometry,
  ancestor: DomElementGeometry,
  elementsById: Map<string, DomElementGeometry>,
): boolean => {
  const visited = new Set<string>();
  let parentId = element.parentInternalId;
  while (parentId && !visited.has(parentId)) {
    if (parentId === ancestor.internalId) return true;
    visited.add(parentId);
    parentId = elementsById.get(parentId)?.parentInternalId;
  }
  return false;
};

const sharesOverflowBoundary = (
  ancestor: DomElementGeometry,
  descendant: DomElementGeometry,
  side: HorizontalOverflowSide,
): boolean => Math.abs(
  side === "left"
    ? ancestor.rect.left - descendant.rect.left
    : ancestor.rect.right - descendant.rect.right,
) <= OVERFLOW_TOLERANCE_PX;

const center = (element: DomElementGeometry): { x: number; y: number } => ({
  x: element.rect.left + element.rect.width / 2,
  y: element.rect.top + element.rect.height / 2,
});

const distanceToRect = (point: { x: number; y: number }, element: DomElementGeometry): number => {
  const horizontalDistance = Math.max(element.rect.left - point.x, 0, point.x - element.rect.right);
  const verticalDistance = Math.max(element.rect.top - point.y, 0, point.y - element.rect.bottom);
  return Math.hypot(horizontalDistance, verticalDistance);
};

const isUndersizedClickTarget = (element: DomElementGeometry): boolean =>
  element.rect.width < MIN_CLICK_TARGET_SIZE || element.rect.height < MIN_CLICK_TARGET_SIZE;

const isAuditableZeroSizeElement = (element: DomElementGeometry): boolean =>
  !ZERO_SIZE_LAYOUT_IGNORED_TAGS.has(element.tagName)
  && usesViewportBoundary(element, "horizontal")
  && usesViewportBoundary(element, "vertical");

const hasInsufficientClickTargetSpacing = (element: DomElementGeometry, clickableElements: DomElementGeometry[]): boolean => {
  const elementCenter = center(element);
  return clickableElements.some((other) => {
    if (other.internalId === element.internalId) return false;
    if (distanceToRect(elementCenter, other) < MIN_CLICK_TARGET_RADIUS) return true;
    if (!isUndersizedClickTarget(other)) return false;
    const otherCenter = center(other);
    return Math.hypot(elementCenter.x - otherCenter.x, elementCenter.y - otherCenter.y) < MIN_CLICK_TARGET_SIZE;
  });
};

export const detectRuntimeLayoutIssues = (input: DetectInput): RuntimeLayoutIssue[] => {
  const elements = input.domGeometry?.elements ?? [];
  const elementsById = new Map(elements.map((element) => [element.internalId, element]));
  const clickableElements = elements.filter((element) => element.clickable && area(element) > 0 && !isIntentionalFocusRevealedControl(element));
  const horizontalOverflowElements = elements.filter((element) =>
    element.rect.width > 0
    && element.rect.height > 0
    && !isFullyOutsideViewport(element, input.viewport)
    && horizontalOverflowSides(element, input.viewport).length > 0,
  );
  const issues: RuntimeLayoutIssue[] = [];

  for (const element of elements) {
    if (element.rect.width <= 0 || element.rect.height <= 0) {
      if (isAuditableZeroSizeElement(element)) {
        issues.push(issue(input, element, "zero-size-visible-element", "warning", "Visible element has zero-size geometry.", "width > 0 and height > 0"));
      }
      continue;
    }
    if (isFullyOutsideViewport(element, input.viewport)) {
      if (isIntentionalFocusRevealedControl(element)) continue;
      issues.push(issue(input, element, "element-outside-viewport", "warning", "Element is fully outside the viewport in an unexpected direction.", `right >= -${OVERFLOW_TOLERANCE_PX}px, left <= viewport.width + ${OVERFLOW_TOLERANCE_PX}px, bottom >= -${OVERFLOW_TOLERANCE_PX}px`));
      continue;
    }
    const overflowSides = horizontalOverflowSides(element, input.viewport);
    const duplicatedByDescendant = overflowSides.some((side) => horizontalOverflowElements.some((candidate) =>
      candidate.internalId !== element.internalId
      && isDescendantOf(candidate, element, elementsById)
      && horizontalOverflowSides(candidate, input.viewport).includes(side)
      && sharesOverflowBoundary(element, candidate, side),
    ));
    if (overflowSides.length > 0 && !duplicatedByDescendant) {
      issues.push(issue(input, element, "horizontal-overflow", "error", "Element extends horizontally outside the viewport.", `left >= 0 and right <= viewport.width + ${OVERFLOW_TOLERANCE_PX}px`));
    }
    // ponytail: geometric scans cover WCAG target size and spacing; add semantic exceptions when DOM capture records inline/equivalent/essential metadata.
    if (element.clickable && isUndersizedClickTarget(element) && hasInsufficientClickTargetSpacing(element, clickableElements)) {
      issues.push(issue(input, element, "small-click-target", "warning", "Clickable target is below the WCAG 2.2 AA minimum size and lacks sufficient spacing.", `${MIN_CLICK_TARGET_SIZE}x${MIN_CLICK_TARGET_SIZE} CSS px or sufficient target spacing`));
    }
  }

  const clickable = clickableElements.slice(0, MAX_OVERLAP_ELEMENTS);
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
