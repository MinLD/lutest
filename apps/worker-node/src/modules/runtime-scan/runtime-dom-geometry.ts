import type { Page } from "playwright";
import type { DomGeometry, RuntimeScanLimits, RuntimeScanViewport } from "./runtime-scan.schema";

export const captureRuntimeDomGeometry = async (input: {
  page: Page;
  viewport: RuntimeScanViewport;
  limits: RuntimeScanLimits;
}): Promise<DomGeometry> => {
  await input.page.evaluate("globalThis.__name = globalThis.__name || ((fn) => fn)");
  return input.page.evaluate(({ viewport, limits }) => {
    const ignoredTags = new Set(limits.ignoredTags.map((tag) => tag.toUpperCase()));
    const textLimit = limits.maxTextSnippetLength;
    const maxElements = limits.maxElementsPerViewport;
    const elements: DomGeometry["elements"] = [];
    const selectorHint = (element: Element): string | undefined => {
      const id = element.getAttribute("id");
      if (id) return `#${CSS.escape(id)}`;
      const role = element.getAttribute("role");
      if (role) return `${element.tagName.toLowerCase()}[role=${CSS.escape(role)}]`;
      const className = typeof (element as HTMLElement).className === "string" ? (element as HTMLElement).className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      return className.length ? `${element.tagName.toLowerCase()}.${className.map((name) => CSS.escape(name)).join(".")}` : element.tagName.toLowerCase();
    };

    for (const [index, element] of Array.from(document.body?.querySelectorAll("*") ?? []).entries()) {
      if (elements.length >= maxElements) break;
      const tagName = element.tagName.toUpperCase();
      if (ignoredTags.has(tagName)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const canCaptureText = tagName !== "INPUT" && tagName !== "TEXTAREA" && tagName !== "SELECT";
      const text = canCaptureText ? (element.textContent ?? "").replace(/\s+/g, " ").trim() : "";
      const role = element.getAttribute("role") ?? undefined;
      elements.push({
        internalId: `el:${index + 1}`,
        tagName,
        selectorHint: selectorHint(element),
        id: element.getAttribute("id") ?? undefined,
        className: typeof (element as HTMLElement).className === "string" ? (element as HTMLElement).className || undefined : undefined,
        role,
        ariaLabel: element.getAttribute("aria-label") ?? undefined,
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
        clickable: Boolean(role === "button" || role === "link" || element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement || element instanceof HTMLInputElement || element.getAttribute("onclick")),
        order: index,
      });
    }

    return {
      viewport,
      capturedAt: new Date().toISOString(),
      elementCount: elements.length,
      truncated: elements.length >= maxElements,
      elements,
    };
  }, { viewport: input.viewport, limits: input.limits });
};
