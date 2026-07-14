import type {
  RuntimeLayoutIssueType,
  RuntimeRect,
  RuntimeScanViewport,
  RuntimeScreenshotMissingReason,
} from "@lutest/contracts";

export type RuntimeImageSize = {
  width: number;
  height: number;
};

export type RuntimeOverlayRect = {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type RuntimeOverlayEdgeMarker = {
  side: "left" | "right" | "top" | "bottom";
  positionPercent: number;
  distancePx: number;
  xPercent: number;
  yPercent: number;
};

export type RuntimeOverlayPointMarker = {
  xPercent: number;
  yPercent: number;
};

export type RuntimeScreenshotProjection = {
  focusTop: number;
  imageWidthPercent: number;
  imageTranslateYPercent: number;
  expandedWidth: boolean;
};

export type RuntimeIssueGuidance = {
  title: string;
  callout: string;
  summary: string;
  impact: string;
  location: string;
  commonCauses: string[];
  suggestedFixes: string[];
  limitation: string;
};

export type RuntimeOverlayCalloutPlacement = {
  vertical: "above" | "below";
  targetX: number;
  targetY: number;
  connectorStartX: number;
  connectorStartY: number;
};

const isPositiveFinite = (value: number): boolean => Number.isFinite(value) && value > 0;
const normalizedPercent = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const rounded = (value: number): number => Math.round(value * 10) / 10;

const rectLocation = (rect: RuntimeRect): string =>
  `x ${rounded(rect.x)}, y ${rounded(rect.y)} · ${rounded(rect.width)} × ${rounded(rect.height)} px`;

const assertNever = (value: never): never => {
  throw new Error(`Unsupported runtime issue type: ${String(value)}`);
};

export function runtimeOverlayCalloutPlacement(
  target: RuntimeOverlayRect | RuntimeOverlayPointMarker,
): RuntimeOverlayCalloutPlacement {
  const isRect = "widthPercent" in target;
  const targetX = isRect ? target.leftPercent + target.widthPercent / 2 : target.xPercent;
  const top = isRect ? target.topPercent : target.yPercent;
  const bottom = isRect ? target.topPercent + target.heightPercent : target.yPercent;
  const vertical = top >= 20 ? "above" : "below";
  const targetY = vertical === "above" ? top : bottom;
  return {
    vertical,
    targetX,
    targetY,
    connectorStartX: targetX,
    connectorStartY: clamp(targetY + (vertical === "below" ? 2 : -2), 0, 100),
  };
}

export function runtimeIssueGuidance(
  type: RuntimeLayoutIssueType,
  rect: RuntimeRect,
  viewport: RuntimeScanViewport,
  overlapRatio?: number,
): RuntimeIssueGuidance {
  switch (type) {
    case "element-outside-viewport": {
      if (rect.right <= 0) {
        const distance = rounded(Math.abs(rect.right));
        return {
          title: "Element is outside the left edge",
          callout: `${distance}px beyond left edge`,
          summary: `The entire element ends ${distance}px before the visible screen begins, so it cannot appear in this screenshot.`,
          impact: "Users cannot see or interact with this element unless the layout moves it back into the viewport.",
          location: `Outside left by ${distance}px · ${rectLocation(rect)}`,
          commonCauses: ["Negative offsets", "absolute positioning", "responsive transform not constrained"],
          suggestedFixes: ["Constrain positioned elements within the viewport", "Use responsive max-width or inset values", "Verify transforms at this viewport width"],
          limitation: "No source file is guessed without source-map evidence.",
        };
      }
      if (rect.left >= viewport.width) {
        const distance = rounded(rect.left - viewport.width);
        return {
          title: "Element is outside the right edge",
          callout: `${distance}px beyond right edge`,
          summary: `The entire element starts ${distance}px after the visible screen ends, so it cannot appear in this screenshot.`,
          impact: "Users cannot see or interact with this element unless the layout moves it back into the viewport.",
          location: `Outside right by ${distance}px · ${rectLocation(rect)}`,
          commonCauses: ["Fixed widths", "absolute positioning", "responsive breakpoint missing"],
          suggestedFixes: ["Constrain width with max-width: 100%", "Prefer responsive grid/flex sizing", "Check right/left offsets at this viewport"],
          limitation: "No source file is guessed without source-map evidence.",
        };
      }
      if (rect.bottom <= 0) {
        const distance = rounded(Math.abs(rect.bottom));
        return {
          title: "Element is above the visible screen",
          callout: `${distance}px beyond top edge`,
          summary: `The entire element ends ${distance}px above the viewport.`,
          impact: "Users cannot see or interact with this element in the captured state.",
          location: `Outside top by ${distance}px · ${rectLocation(rect)}`,
          commonCauses: ["Negative top offset", "hidden-until-focus pattern", "transform moves content offscreen"],
          suggestedFixes: ["Keep active UI within the visible viewport", "Use accessible focus-reveal patterns", "Verify transform and position constraints"],
          limitation: "No source file is guessed without source-map evidence.",
        };
      }
      const distance = rounded(rect.top - viewport.height);
      return {
        title: "Element is below the visible screen",
        callout: `${distance}px beyond bottom edge`,
        summary: `The entire element starts ${distance}px below the captured viewport.`,
        impact: "Users cannot see or interact with this element in the captured state.",
        location: `Outside bottom by ${distance}px · ${rectLocation(rect)}`,
        commonCauses: ["Content anchored past the fold", "fixed-height container", "responsive spacing overflow"],
        suggestedFixes: ["Allow containers to grow or scroll intentionally", "Use responsive spacing clamps", "Check vertical positioning constraints"],
        limitation: "No source file is guessed without source-map evidence.",
      };
    }
    case "horizontal-overflow": {
      const leftOverflow = Math.max(0, -rect.left);
      const rightOverflow = Math.max(0, rect.right - viewport.width);
      const direction = rightOverflow >= leftOverflow ? `right edge by ${rounded(rightOverflow)}px` : `left edge by ${rounded(leftOverflow)}px`;
      return {
        title: "Element extends beyond the screen width",
        callout: direction,
        summary: `Part of this element overflows the ${direction}.`,
        impact: "Content may be clipped or force unwanted horizontal scrolling.",
        location: rectLocation(rect),
        commonCauses: ["Fixed pixel width", "negative margins", "absolute positioning", "unbounded media or table"],
        suggestedFixes: ["Use max-width: 100%", "Remove fixed viewport-breaking widths", "Constrain media/table overflow", "Inspect absolute left/right offsets"],
        limitation: "No source file is guessed without source-map evidence.",
      };
    }
    case "zero-size-visible-element":
      return {
        title: "Visible content escapes a zero-size box",
        callout: `${rounded(rect.width)} × ${rounded(rect.height)}px box`,
        summary: "The layout gives this element no usable width or height, but its content is still painted outside that box.",
        impact: "The content can overlap nearby UI, be clipped, or have an unreliable interaction area.",
        location: `Anchor point · ${rectLocation(rect)}`,
        commonCauses: ["Missing intrinsic content size", "absolute children escaping parent", "display/layout constraint mismatch"],
        suggestedFixes: ["Give the container an explicit usable size", "Contain positioned children", "Check display, content, and layout constraints"],
        limitation: "No source file is guessed without source-map evidence.",
      };
    case "small-click-target":
      return {
        title: "Interactive target may be difficult to press",
        callout: `${rounded(rect.width)} × ${rounded(rect.height)}px · minimum 24 × 24px`,
        summary: `The measured clickable area is ${rounded(rect.width)} × ${rounded(rect.height)}px.`,
        impact: "Touch and motor-impaired users may miss this control unless it has sufficient spacing from nearby targets.",
        location: rectLocation(rect),
        commonCauses: ["Icon-only button without padding", "tight inline link", "small custom control"],
        suggestedFixes: ["Add padding or min-width/min-height", "Target at least 44 × 44 CSS px where practical", "Keep sufficient spacing from adjacent controls"],
        limitation: "No source file is guessed without source-map evidence.",
      };
    case "suspicious-overlap":
      return {
        title: "Interactive elements overlap",
        callout: overlapRatio === undefined ? "Overlapping click areas" : `${Math.round(overlapRatio * 100)}% overlap`,
        summary: overlapRatio === undefined
          ? "The primary and related clickable regions occupy the same screen area."
          : `The related element covers about ${Math.round(overlapRatio * 100)}% of the primary clickable area.`,
        impact: "One control may hide another or receive the user's click unexpectedly.",
        location: rectLocation(rect),
        commonCauses: ["z-index conflict", "absolute or fixed positioning", "negative margins", "responsive stacking issue"],
        suggestedFixes: ["Inspect z-index and stacking contexts", "Adjust position/margin rules", "Add responsive spacing or wrapping", "Confirm intended layering"],
        limitation: "No source file is guessed without source-map evidence.",
      };
    case "low-text-contrast":
      return {
        title: "Text is difficult to read against its background",
        callout: "Contrast is below the WCAG AA requirement",
        summary: "The computed foreground and effective background colors are too similar.",
        impact: "People with low vision or displays in difficult lighting may not be able to read this text.",
        location: rectLocation(rect),
        commonCauses: ["Low-contrast design token", "theme color mismatch", "disabled/muted text over light background"],
        suggestedFixes: ["Adjust color tokens to meet WCAG AA", "Increase foreground/background contrast", "Use the suggested foreground color only after design review"],
        limitation: "Guidance is deterministic color evidence only; no OCR, AI analysis, or automatic source edit is performed.",
      };
    default:
      return assertNever(type);
  }
}

export function runtimeScreenshotProjection(
  rect: RuntimeRect | undefined,
  viewport: RuntimeScanViewport,
  naturalImageSize: RuntimeImageSize,
): RuntimeScreenshotProjection | undefined {
  if (!isPositiveFinite(viewport.width) || !isPositiveFinite(viewport.height) || !isPositiveFinite(naturalImageSize.width) || !isPositiveFinite(naturalImageSize.height)) return undefined;
  if (naturalImageSize.width + 1 < viewport.width || naturalImageSize.height + 1 < viewport.height) return undefined;
  const focusCenter = rect ? rect.y + Math.max(rect.height, 1) / 2 : viewport.height / 2;
  const focusTop = clamp(focusCenter - viewport.height / 2, 0, Math.max(0, naturalImageSize.height - viewport.height));
  return {
    focusTop,
    imageWidthPercent: normalizedPercent((naturalImageSize.width / viewport.width) * 100),
    imageTranslateYPercent: normalizedPercent((focusTop / naturalImageSize.height) * 100),
    expandedWidth: naturalImageSize.width > viewport.width + 1,
  };
}

export function runtimeOverlayRect(
  rect: RuntimeRect | undefined,
  viewport: RuntimeScanViewport,
  naturalImageSize: RuntimeImageSize,
  focusTop = 0,
): RuntimeOverlayRect | undefined {
  if (!rect || !isPositiveFinite(viewport.width) || !isPositiveFinite(viewport.height) || !isPositiveFinite(naturalImageSize.width) || !isPositiveFinite(naturalImageSize.height)) return undefined;
  const left = Math.max(0, rect.x);
  const top = Math.max(focusTop, rect.y);
  const right = Math.min(viewport.width, rect.x + rect.width);
  const bottom = Math.min(focusTop + viewport.height, rect.y + rect.height);
  if (right <= left || bottom <= top) return undefined;
  return {
    leftPercent: normalizedPercent((left / viewport.width) * 100),
    topPercent: normalizedPercent(((top - focusTop) / viewport.height) * 100),
    widthPercent: normalizedPercent(((right - left) / viewport.width) * 100),
    heightPercent: normalizedPercent(((bottom - top) / viewport.height) * 100),
  };
}

export function runtimeOverlayEdgeMarker(
  rect: RuntimeRect | undefined,
  viewport: RuntimeScanViewport,
  naturalImageSize: RuntimeImageSize,
  focusTop = 0,
): RuntimeOverlayEdgeMarker | undefined {
  if (!rect || !isPositiveFinite(viewport.width) || !isPositiveFinite(naturalImageSize.width) || !isPositiveFinite(naturalImageSize.height)) return undefined;
  const sourceWidth = viewport.width;
  const sourceBottom = focusTop + viewport.height;
  const horizontalPosition = normalizedPercent(Math.min(100, Math.max(0, ((rect.x + rect.width / 2) / sourceWidth) * 100)));
  const verticalPosition = normalizedPercent(Math.min(100, Math.max(0, ((rect.y + rect.height / 2 - focusTop) / viewport.height) * 100)));
  if (rect.x + rect.width <= 0) return { side: "left", positionPercent: verticalPosition, distancePx: Math.abs(rect.x + rect.width), xPercent: 1, yPercent: verticalPosition };
  if (rect.x >= sourceWidth) return { side: "right", positionPercent: verticalPosition, distancePx: rect.x - sourceWidth, xPercent: 99, yPercent: verticalPosition };
  if (rect.y + rect.height <= focusTop) return { side: "top", positionPercent: horizontalPosition, distancePx: focusTop - (rect.y + rect.height), xPercent: horizontalPosition, yPercent: 1 };
  if (rect.y >= sourceBottom) return { side: "bottom", positionPercent: horizontalPosition, distancePx: rect.y - sourceBottom, xPercent: horizontalPosition, yPercent: 99 };
  return undefined;
}

export function runtimeOverlayPointMarker(
  rect: RuntimeRect | undefined,
  viewport: RuntimeScanViewport,
  naturalImageSize: RuntimeImageSize,
  focusTop = 0,
): RuntimeOverlayPointMarker | undefined {
  if (!rect || (rect.width > 0 && rect.height > 0) || !isPositiveFinite(viewport.width) || !isPositiveFinite(viewport.height) || !isPositiveFinite(naturalImageSize.width) || !isPositiveFinite(naturalImageSize.height)) return undefined;
  if (rect.x < 0 || rect.x > viewport.width || rect.y < focusTop || rect.y > focusTop + viewport.height) return undefined;
  return {
    xPercent: normalizedPercent((rect.x / viewport.width) * 100),
    yPercent: normalizedPercent(((rect.y - focusTop) / viewport.height) * 100),
  };
}

export function runtimeScreenshotMissingLabel(reason: RuntimeScreenshotMissingReason | undefined): string {
  if (reason === "not-captured") return "Screenshot was not captured for this viewport.";
  if (reason === "capture-failed") return "Screenshot capture failed.";
  if (reason === "artifact-missing") return "Screenshot artifact is missing.";
  if (reason === "artifact-invalid") return "Screenshot artifact is invalid.";
  return "No screenshot is available for this issue.";
}
