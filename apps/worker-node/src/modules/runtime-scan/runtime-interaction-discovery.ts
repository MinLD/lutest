import crypto from "node:crypto";
import type { Page } from "playwright";
import type {
  DomGeometry,
  RuntimeInteractionControlKind,
  RuntimeInteractionSkipReason,
  RuntimeInteractionSource,
  RuntimeSkippedInteraction,
} from "./runtime-scan.schema";

export type RuntimeInteractionCandidate = RuntimeInteractionSource & { selector: string };

type CandidateDiscovery = {
  candidates: RuntimeInteractionCandidate[];
  skipped: RuntimeSkippedInteraction[];
};

const digest = (value: string): string => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);

export const runtimeInteractionStateDedupKey = (geometry: DomGeometry): string => {
  const signature = geometry.elements.map((element) => ({
    tag: element.tagName,
    role: element.role,
    text: element.textSnippet,
    rect: [element.rect.x, element.rect.y, element.rect.width, element.rect.height].map((value) => Math.round(value * 10) / 10),
  }));
  return `state_${digest(JSON.stringify(signature))}`;
};

export const runtimeInteractionIssueDedupKey = (input: {
  type: string;
  selector?: string;
  viewport: { width: number; height: number };
  boundingBox: { x: number; y: number; width: number; height: number };
  relatedBoundingBox?: { x: number; y: number; width: number; height: number };
}): string => digest(JSON.stringify({
  type: input.type,
  selector: input.selector,
  viewport: input.viewport,
  box: input.boundingBox,
  related: input.relatedBoundingBox,
}));

export const discoverRuntimeInteractionCandidates = async (page: Page): Promise<CandidateDiscovery> => {
  await page.evaluate("globalThis.__name = globalThis.__name || ((fn) => fn)");
  return page.evaluate(() => {
    type Kind = RuntimeInteractionControlKind;
    type Reason = RuntimeInteractionSkipReason;
    type Evaluated = { candidateId: string; selector: string; kind?: Kind; label?: string; priority: number; order: number; reason?: Reason };
    const dangerous = /\b(delete|remove|logout|sign\s*out|submit|save|confirm|checkout|payment|pay|purchase|buy|send|upload|create|update)\b/i;
    const safeAction = /\b(open|show|toggle|expand|menu|filter|sort|settings|details|more|options)\b/i;
    const sensitive = /\b(cookie|token|password|storageState|localStorage|sessionStorage)\b|\.lutest|(?:^|\s)\/(?:home|Users|tmp|var|root|mnt|workspace)\/|[a-zA-Z]:[\\/]|\n\s*at\s+/i;
    const elements = Array.from(document.querySelectorAll("button, a[href], [role='button'], [role='tab'], [role='menuitem'], [role='switch'], [aria-expanded], [aria-haspopup]"));
    const selectorFor = (element: Element): string => {
      const id = element.getAttribute("id");
      if (id && /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(id)) return `#${CSS.escape(id)}`;
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && current !== document.body && parts.length < 5) {
        const tag = current.tagName.toLowerCase();
        const siblings = current.parentElement ? Array.from(current.parentElement.children).filter((child) => child.tagName === current?.tagName) : [];
        parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(current) + 1})` : tag);
        current = current.parentElement;
      }
      return parts.join(" > ");
    };
    const kindFor = (element: Element, label: string): Kind | undefined => {
      const role = element.getAttribute("role");
      const popup = element.getAttribute("aria-haspopup");
      if (role === "tab") return "tab";
      if (role === "switch") return "toggle";
      if (popup === "dialog") return "modal-trigger";
      if (popup === "menu" || popup === "listbox") return "dropdown";
      if (/filter|sort/i.test(label)) return "filter-sort";
      if (/drawer/i.test(label)) return "drawer";
      if (role === "menuitem") return "menu";
      if (element.hasAttribute("aria-expanded")) return "accordion";
      if (element.hasAttribute("aria-controls") || safeAction.test(label)) return "toggle";
      return undefined;
    };
    const evaluated: Evaluated[] = elements.map((element, index) => {
      const candidateId = `candidate_${index + 1}`;
      const htmlElement = element as HTMLElement;
      const style = getComputedStyle(htmlElement);
      const rect = htmlElement.getBoundingClientRect();
      const rawLabel = element.getAttribute("aria-label") ?? element.getAttribute("title") ?? (element.textContent ?? "");
      const label = rawLabel.replace(/\s+/g, " ").trim().slice(0, 80);
      const selector = selectorFor(element);
      const kind = kindFor(element, label);
      const inNavigation = Boolean(element.closest("nav, aside, [role='navigation']"));
      const globalPreferenceControl = /\b(theme|dark|light|language|locale|donate)\b/i.test(label);
      const priority = (inNavigation ? -40 : 0) + (globalPreferenceControl ? 60 : 0);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) return { candidateId, selector, kind, label, priority, order: index, reason: "not-visible" };
      if ((element as HTMLButtonElement).disabled || element.getAttribute("aria-disabled") === "true") return { candidateId, selector, kind, label, priority, order: index, reason: "disabled" };
      const form = element.closest("form");
      if (form && Array.from(form.querySelectorAll("input[required], textarea[required], select[required]")).some((field) => !(field as HTMLInputElement).value)) return { candidateId, selector, kind, label, priority, order: index, reason: "requires-input" };
      const buttonType = element instanceof HTMLButtonElement ? element.type : undefined;
      if ((form && (buttonType === "submit" || buttonType === "reset")) || dangerous.test(label) || (/\bapply\b/i.test(label) && form)) return { candidateId, selector, kind, label, priority, order: index, reason: "destructive" };
      const onclick = element.getAttribute("onclick") ?? "";
      if (element instanceof HTMLAnchorElement || element.hasAttribute("href") || element.hasAttribute("target") || /location|history|window\.open/i.test(onclick)) return { candidateId, selector, kind, label, priority, order: index, reason: "route-change-risk" };
      if (!label || sensitive.test(label)) return { candidateId, selector, kind, priority, order: index, reason: "unsafe-candidate" };
      if (!kind) return { candidateId, selector, label, priority, order: index, reason: element.getAttribute("role") ? "unsupported-control" : "unsafe-candidate" };
      return { candidateId, selector, kind, label, priority, order: index };
    });
    const seen = new Set<string>();
    const candidates: RuntimeInteractionCandidate[] = [];
    const skipped: RuntimeSkippedInteraction[] = [];
    for (const item of evaluated.sort((left, right) => left.priority - right.priority || left.order - right.order)) {
      if (item.reason) {
        skipped.push({ candidateId: item.candidateId, kind: item.kind, label: item.label, reason: item.reason });
        continue;
      }
      if (!item.kind || !item.label) continue;
      const key = `${item.selector}:${item.kind}`;
      if (seen.has(key)) {
        skipped.push({ candidateId: item.candidateId, kind: item.kind, label: item.label, reason: "duplicate-state" });
        continue;
      }
      seen.add(key);
      candidates.push({ candidateId: item.candidateId, selector: item.selector, kind: item.kind, label: item.label, action: "click" });
    }
    return { candidates, skipped };
  });
};

export const clickRuntimeInteractionCandidate = async (input: {
  page: Page;
  candidate: RuntimeInteractionCandidate;
  expectedUrl: string;
  timeoutMs: number;
}): Promise<"clicked" | "not-visible" | "route-change-risk"> => {
  const locator = input.page.locator(input.candidate.selector).first();
  if (!await locator.isVisible().catch(() => false)) return "not-visible";
  await input.page.evaluate(() => {
    const scope = globalThis as typeof globalThis & { __lutestRouteChangeRisk?: boolean };
    scope.__lutestRouteChangeRisk = false;
    history.pushState = (() => { scope.__lutestRouteChangeRisk = true; }) as History["pushState"];
    history.replaceState = (() => { scope.__lutestRouteChangeRisk = true; }) as History["replaceState"];
    window.open = (() => { scope.__lutestRouteChangeRisk = true; return null; }) as typeof window.open;
  });
  const before = input.page.url();
  await locator.click({ timeout: input.timeoutMs });
  await input.page.waitForTimeout(75);
  const after = input.page.url();
  const routeChangeRisk = await input.page.evaluate(() => Boolean((globalThis as typeof globalThis & { __lutestRouteChangeRisk?: boolean }).__lutestRouteChangeRisk));
  return routeChangeRisk || before !== after || after !== input.expectedUrl ? "route-change-risk" : "clicked";
};
