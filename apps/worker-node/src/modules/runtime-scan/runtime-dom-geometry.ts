import type { Page } from "playwright";
import {
  DEFAULT_CANVAS_BACKGROUND,
  MIN_AUDITABLE_FOREGROUND_ALPHA,
  MIN_OPAQUE_ELEMENT_OPACITY,
  RUNTIME_TEXT_REDACTION_RULES,
  WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX,
  WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT,
  WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX,
} from "./runtime-readability-policy";
import type { DomGeometry, RuntimeReadabilitySkipReason, RuntimeScanLimits, RuntimeScanViewport } from "./runtime-scan.schema";

export const captureRuntimeDomGeometry = async (input: {
  page: Page;
  viewport: RuntimeScanViewport;
  limits: RuntimeScanLimits;
}): Promise<DomGeometry> => {
  await input.page.evaluate("globalThis.__name = globalThis.__name || ((fn) => fn)");
  return input.page.evaluate(({ viewport, limits, readabilityPolicy, redactionRules }) => {
    const ignoredTags = new Set(limits.ignoredTags.map((tag) => tag.toUpperCase()));
    const textLimit = limits.maxTextSnippetLength;
    const maxElements = limits.maxElementsPerViewport;
    const elements: DomGeometry["elements"] = [];
    const computedStyleCache = new Map<Element, CSSStyleDeclaration>();
    const computedStyle = (element: Element): CSSStyleDeclaration => {
      const cached = computedStyleCache.get(element);
      if (cached) return cached;
      const style = window.getComputedStyle(element);
      computedStyleCache.set(element, style);
      return style;
    };
    const skippedByReason: Partial<Record<RuntimeReadabilitySkipReason, number>> = {};
    const readabilityCoverage: NonNullable<DomGeometry["readabilityCoverage"]> = {
      candidateTextCount: 0,
      checkedTextCount: 0,
      skippedTextCount: 0,
      skippedByReason,
      incomplete: false,
    };
    const recordReadabilitySkip = (reason: RuntimeReadabilitySkipReason): void => {
      readabilityCoverage.skippedTextCount += 1;
      skippedByReason[reason] = (skippedByReason[reason] ?? 0) + 1;
    };
    type Rgba = { red: number; green: number; blue: number; alpha: number };
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = 1;
    colorCanvas.height = 1;
    const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
    const cssColor = (value: string): Rgba | undefined => {
      if (!colorContext) return undefined;
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = "rgba(0, 0, 0, 0)";
      colorContext.fillStyle = value;
      colorContext.fillRect(0, 0, 1, 1);
      const [red, green, blue, alpha] = colorContext.getImageData(0, 0, 1, 1).data;
      if (red === undefined || green === undefined || blue === undefined || alpha === undefined) return undefined;
      return { red, green, blue, alpha: alpha / 255 };
    };
    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
      if (alpha <= 0) return { red: 255, green: 255, blue: 255, alpha: 1 };
      return {
        red: (foreground.red * foreground.alpha + background.red * background.alpha * (1 - foreground.alpha)) / alpha,
        green: (foreground.green * foreground.alpha + background.green * background.alpha * (1 - foreground.alpha)) / alpha,
        blue: (foreground.blue * foreground.alpha + background.blue * background.alpha * (1 - foreground.alpha)) / alpha,
        alpha,
      };
    };
    const hex = (color: Rgba): string => `#${[color.red, color.green, color.blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
    const directText = (element: Element): boolean => Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
    const redactText = (value: string): string => redactionRules.reduce(
      (redacted, rule) => redacted.replace(new RegExp(rule.source, rule.flags), rule.replacement),
      value,
    );
    type BackgroundResolution = { background: Rgba } | { reason: RuntimeReadabilitySkipReason };
    const backgroundCache = new Map<Element, BackgroundResolution>();
    const resolveBackground = (element: Element): BackgroundResolution => {
      const cached = backgroundCache.get(element);
      if (cached) return cached;
      const parentResolution: BackgroundResolution = element.parentElement
        ? resolveBackground(element.parentElement)
        : { background: readabilityPolicy.defaultCanvasBackground };
      if ("reason" in parentResolution) {
        backgroundCache.set(element, parentResolution);
        return parentResolution;
      }
      const currentStyle = computedStyle(element);
      let resolution: BackgroundResolution;
      if (currentStyle.backgroundImage !== "none") resolution = { reason: "background-image" };
      else if (Number(currentStyle.opacity) < readabilityPolicy.minOpaqueElementOpacity) resolution = { reason: "transparent-ancestor" };
      else if (currentStyle.mixBlendMode !== "normal" || currentStyle.backgroundBlendMode !== "normal" || currentStyle.filter !== "none" || currentStyle.backdropFilter !== "none" || currentStyle.getPropertyValue("mask-image") !== "none") resolution = { reason: "unsupported-effect" };
      else {
        const layer = cssColor(currentStyle.backgroundColor);
        resolution = layer ? { background: composite(layer, parentResolution.background) } : { reason: "invalid-color" };
      }
      backgroundCache.set(element, resolution);
      return resolution;
    };
    const textStyleEvidence = (element: Element, style: CSSStyleDeclaration): DomGeometry["elements"][number]["textStyle"] => {
      if (!directText(element)) return undefined;
      readabilityCoverage.candidateTextCount += 1;
      if (element.closest("[aria-hidden=true]")) {
        recordReadabilitySkip("aria-hidden");
        return undefined;
      }
      if (style.textShadow !== "none") {
        recordReadabilitySkip("text-shadow");
        return undefined;
      }
      const backgroundResolution = resolveBackground(element);
      if ("reason" in backgroundResolution) {
        recordReadabilitySkip(backgroundResolution.reason);
        return undefined;
      }
      const background = backgroundResolution.background;
      const foregroundLayer = cssColor(style.color);
      if (!foregroundLayer) {
        recordReadabilitySkip("invalid-color");
        return undefined;
      }
      if (foregroundLayer.alpha < readabilityPolicy.minAuditableForegroundAlpha) {
        recordReadabilitySkip("transparent-foreground");
        return undefined;
      }
      const foreground = composite(foregroundLayer, background);
      const fontSizePx = Number.parseFloat(style.fontSize);
      const parsedWeight = Number.parseInt(style.fontWeight, 10);
      const fontWeight = Number.isFinite(parsedWeight) ? parsedWeight : style.fontWeight === "bold" ? 700 : 400;
      if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) {
        recordReadabilitySkip("invalid-font-size");
        return undefined;
      }
      readabilityCoverage.checkedTextCount += 1;
      return {
        foregroundColor: hex(foreground),
        backgroundColor: hex(background),
        fontSizePx,
        fontWeight,
        largeText: fontSizePx >= readabilityPolicy.largeTextMinFontSizePx || (fontSizePx >= readabilityPolicy.largeBoldTextMinFontSizePx && fontWeight >= readabilityPolicy.largeBoldTextMinFontWeight),
      };
    };
    const selectorHint = (element: Element): string | undefined => {
      const id = element.getAttribute("id");
      if (id) return `#${CSS.escape(id)}`;
      const role = element.getAttribute("role");
      if (role) return `${element.tagName.toLowerCase()}[role=${CSS.escape(role)}]`;
      const className = typeof (element as HTMLElement).className === "string" ? (element as HTMLElement).className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      return className.length ? `${element.tagName.toLowerCase()}.${className.map((name) => CSS.escape(name)).join(".")}` : element.tagName.toLowerCase();
    };
    const boundaryFor = (element: Element, axis: "x" | "y"): "viewport" | "clipped-ancestor" | "scrollable-ancestor" => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
        const style = computedStyle(ancestor);
        const overflow = axis === "x" ? style.overflowX : style.overflowY;
        if (overflow === "hidden" || overflow === "clip") return "clipped-ancestor";
        if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") return "scrollable-ancestor";
        ancestor = ancestor.parentElement;
      }
      return "viewport";
    };

    const documentElements = Array.from(document.body?.querySelectorAll("*") ?? []);
    const internalIds = new Map(documentElements.map((element, index) => [element, `el:${index + 1}`]));
    for (const [index, element] of documentElements.entries()) {
      if (elements.length >= maxElements) break;
      const tagName = element.tagName.toUpperCase();
      if (ignoredTags.has(tagName)) continue;
      const rect = element.getBoundingClientRect();
      const style = computedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const canCaptureText = tagName !== "INPUT" && tagName !== "TEXTAREA" && tagName !== "SELECT";
      const text = canCaptureText ? redactText((element.textContent ?? "").replace(/\s+/g, " ").trim()) : "";
      const role = element.getAttribute("role") ?? undefined;
      const rawAriaLabel = element.getAttribute("aria-label") ?? undefined;
      const ariaLabel = rawAriaLabel ? redactText(rawAriaLabel).slice(0, textLimit) : undefined;
      const clickable = Boolean(role === "button" || role === "link" || element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement || element instanceof HTMLInputElement || element.getAttribute("onclick"));
      if ((rect.width <= 0 || rect.height <= 0) && !text && !ariaLabel && !clickable) continue;
      elements.push({
        internalId: `el:${index + 1}`,
        parentInternalId: element.parentElement ? internalIds.get(element.parentElement) : undefined,
        tagName,
        selectorHint: selectorHint(element),
        id: element.getAttribute("id") ?? undefined,
        className: typeof (element as HTMLElement).className === "string" ? (element as HTMLElement).className || undefined : undefined,
        role,
        ariaLabel,
        textSnippet: text ? text.slice(0, textLimit) : undefined,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        },
        visibility: {
          display: style.display,
          visibility: style.visibility,
          opacity: Number(style.opacity),
        },
        textStyle: textStyleEvidence(element, style),
        viewportBoundary: {
          horizontal: boundaryFor(element, "x"),
          vertical: boundaryFor(element, "y"),
        },
        clickable,
        order: index,
      });
    }

    readabilityCoverage.incomplete = elements.length >= maxElements;
    return {
      viewport,
      capturedAt: new Date().toISOString(),
      elementCount: elements.length,
      truncated: elements.length >= maxElements,
      readabilityCoverage,
      elements,
    };
  }, {
    viewport: input.viewport,
    limits: input.limits,
    readabilityPolicy: {
      defaultCanvasBackground: DEFAULT_CANVAS_BACKGROUND,
      minAuditableForegroundAlpha: MIN_AUDITABLE_FOREGROUND_ALPHA,
      minOpaqueElementOpacity: MIN_OPAQUE_ELEMENT_OPACITY,
      largeTextMinFontSizePx: WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX,
      largeBoldTextMinFontSizePx: WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX,
      largeBoldTextMinFontWeight: WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT,
    },
    redactionRules: RUNTIME_TEXT_REDACTION_RULES,
  });
};
