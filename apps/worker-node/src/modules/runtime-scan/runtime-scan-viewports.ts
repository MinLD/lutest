import type { RuntimeScanViewport } from "./runtime-scan.schema";

export type RuntimeNamedViewport = RuntimeScanViewport & { name: "mobile" | "tablet" | "desktop" | "custom" };

export const DEFAULT_RUNTIME_VIEWPORT_MATRIX: RuntimeNamedViewport[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

export const resolveRuntimeScanViewports = (viewport?: RuntimeScanViewport): RuntimeNamedViewport[] => {
  if (!viewport) return DEFAULT_RUNTIME_VIEWPORT_MATRIX;
  return [{ name: "custom", width: viewport.width, height: viewport.height }];
};

export const viewportSlug = (viewport: RuntimeNamedViewport): string =>
  `${viewport.name}-${viewport.width}x${viewport.height}`;
