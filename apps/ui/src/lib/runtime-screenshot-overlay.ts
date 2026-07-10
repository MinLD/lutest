import type {
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

const isPositiveFinite = (value: number): boolean => Number.isFinite(value) && value > 0;
const normalizedPercent = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

export function runtimeOverlayRect(
  rect: RuntimeRect | undefined,
  viewport: RuntimeScanViewport,
  naturalImageSize: RuntimeImageSize,
): RuntimeOverlayRect | undefined {
  if (!rect || !isPositiveFinite(viewport.width) || !isPositiveFinite(viewport.height) || !isPositiveFinite(naturalImageSize.width) || !isPositiveFinite(naturalImageSize.height)) return undefined;
  const pixelRatio = naturalImageSize.width / viewport.width;
  if (!isPositiveFinite(pixelRatio)) return undefined;
  const sourceWidth = naturalImageSize.width / pixelRatio;
  const sourceHeight = Math.min(viewport.height, naturalImageSize.height / pixelRatio);
  const left = Math.max(0, rect.x);
  const top = Math.max(0, rect.y);
  const right = Math.min(sourceWidth, rect.x + rect.width);
  const bottom = Math.min(sourceHeight, rect.y + rect.height);
  if (right <= left || bottom <= top) return undefined;
  return {
    leftPercent: normalizedPercent((left / sourceWidth) * 100),
    topPercent: normalizedPercent((top / sourceHeight) * 100),
    widthPercent: normalizedPercent(((right - left) / sourceWidth) * 100),
    heightPercent: normalizedPercent(((bottom - top) / sourceHeight) * 100),
  };
}

export function runtimeOverlayEdgeMarker(
  rect: RuntimeRect | undefined,
  viewport: RuntimeScanViewport,
  naturalImageSize: RuntimeImageSize,
): RuntimeOverlayEdgeMarker | undefined {
  if (!rect || !isPositiveFinite(viewport.width) || !isPositiveFinite(naturalImageSize.width) || !isPositiveFinite(naturalImageSize.height)) return undefined;
  const pixelRatio = naturalImageSize.width / viewport.width;
  if (!isPositiveFinite(pixelRatio)) return undefined;
  const sourceWidth = viewport.width;
  const sourceHeight = Math.min(viewport.height, naturalImageSize.height / pixelRatio);
  const horizontalPosition = normalizedPercent(Math.min(100, Math.max(0, ((rect.x + rect.width / 2) / sourceWidth) * 100)));
  const verticalPosition = normalizedPercent(Math.min(100, Math.max(0, ((rect.y + rect.height / 2) / sourceHeight) * 100)));
  if (rect.x + rect.width <= 0) return { side: "left", positionPercent: verticalPosition, distancePx: Math.abs(rect.x + rect.width), xPercent: 1, yPercent: verticalPosition };
  if (rect.x >= sourceWidth) return { side: "right", positionPercent: verticalPosition, distancePx: rect.x - sourceWidth, xPercent: 99, yPercent: verticalPosition };
  if (rect.y + rect.height <= 0) return { side: "top", positionPercent: horizontalPosition, distancePx: Math.abs(rect.y + rect.height), xPercent: horizontalPosition, yPercent: 1 };
  if (rect.y >= sourceHeight) return { side: "bottom", positionPercent: horizontalPosition, distancePx: rect.y - sourceHeight, xPercent: horizontalPosition, yPercent: 99 };
  return undefined;
}

export function runtimeScreenshotMissingLabel(reason: RuntimeScreenshotMissingReason | undefined): string {
  if (reason === "not-captured") return "Screenshot was not captured for this viewport.";
  if (reason === "capture-failed") return "Screenshot capture failed.";
  if (reason === "artifact-missing") return "Screenshot artifact is missing.";
  if (reason === "artifact-invalid") return "Screenshot artifact is invalid.";
  return "No screenshot is available for this issue.";
}
