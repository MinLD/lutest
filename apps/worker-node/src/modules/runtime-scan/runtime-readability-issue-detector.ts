import type { DomElementGeometry, DomGeometry, RuntimeLayoutIssue, RuntimeScanViewport } from "./runtime-scan.schema";
import {
  WCAG_AA_LARGE_TEXT_MIN_CONTRAST,
  WCAG_AA_NORMAL_TEXT_MIN_CONTRAST,
} from "./runtime-readability-policy";
import { hexToOklch, oklchDelta, suggestForegroundForContrast, wcagContrastRatio } from "./runtime-oklch";

type DetectInput = {
  scanTargetId: string;
  stateId?: string;
  route: string;
  viewport: RuntimeScanViewport;
  domGeometry?: DomGeometry;
  screenshotPath?: string;
};

export const contrastRatio = wcagContrastRatio;

const issue = (input: DetectInput, element: DomElementGeometry, ratio: number, required: number): RuntimeLayoutIssue => {
  const foregroundColor = element.textStyle?.foregroundColor;
  const backgroundColor = element.textStyle?.backgroundColor;
  const foregroundOklch = foregroundColor ? hexToOklch(foregroundColor) : undefined;
  const backgroundOklch = backgroundColor ? hexToOklch(backgroundColor) : undefined;
  const suggestion = foregroundColor && backgroundColor ? suggestForegroundForContrast({ foreground: foregroundColor, background: backgroundColor, requiredContrastRatio: required }) : undefined;
  return {
    id: `${input.scanTargetId}:${input.stateId ?? "baseline"}:${input.viewport.width}x${input.viewport.height}:low-text-contrast:${element.internalId}`,
    type: "low-text-contrast",
    code: "low-text-contrast",
    severity: "warning",
    message: "Text and background colors do not meet the WCAG 2.2 AA contrast requirement.",
    scanTargetId: input.scanTargetId,
    route: input.route,
    viewport: input.viewport,
    elementRef: element.internalId,
    evidence: {
      selectorHint: element.selectorHint,
      boundingBox: element.rect,
      viewport: input.viewport,
      screenshotPath: input.screenshotPath,
      threshold: `${required}:1 minimum contrast for ${element.textStyle?.largeText ? "large" : "normal"} text`,
      foregroundColor,
      backgroundColor,
      contrastRatio: Math.round(ratio * 100) / 100,
      requiredContrastRatio: required,
      foregroundOklch,
      backgroundOklch,
      oklchDelta: foregroundOklch && backgroundOklch ? oklchDelta(foregroundOklch, backgroundOklch) : undefined,
      suggestedForegroundColor: suggestion?.color,
      suggestionReason: suggestion?.reason,
    },
  };
};

export const detectRuntimeReadabilityIssues = (input: DetectInput): RuntimeLayoutIssue[] => {
  const issues: RuntimeLayoutIssue[] = [];
  for (const element of input.domGeometry?.elements ?? []) {
    if (!element.textStyle || element.rect.width <= 0 || element.rect.height <= 0 || element.rect.right <= 0 || element.rect.left >= input.viewport.width || element.rect.bottom <= 0 || element.rect.top >= input.viewport.height) continue;
    const ratio = contrastRatio(element.textStyle.foregroundColor, element.textStyle.backgroundColor);
    if (ratio === undefined) continue;
    const required = element.textStyle.largeText ? WCAG_AA_LARGE_TEXT_MIN_CONTRAST : WCAG_AA_NORMAL_TEXT_MIN_CONTRAST;
    if (ratio + Number.EPSILON < required) issues.push(issue(input, element, ratio, required));
  }
  return issues;
};
