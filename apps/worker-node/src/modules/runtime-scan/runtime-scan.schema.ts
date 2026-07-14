import {
  redactRuntimeTextEvidence,
  WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX,
  WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT,
  WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX,
} from "./runtime-readability-policy";
import { wcagContrastRatio } from "./runtime-oklch";

export const RUNTIME_SCAN_SCHEMA_VERSION = "runtime-scan.v1";

export type RuntimeScanViewport = { width: number; height: number; name?: "mobile" | "tablet" | "desktop" | "custom" };

export type RuntimeScanLimits = {
  maxRoutes: number;
  maxTargets: number;
  maxElementsPerViewport: number;
  maxTextSnippetLength: number;
  routeTimeoutMs: number;
  scanTimeoutMs: number;
  maxInteractionsPerRoute: number;
  maxStatesPerRoute: number;
  interactionDiscoveryTimeoutMs: number;
  ignoredTags: string[];
};

export type RuntimeInteractionControlKind = "tab" | "dropdown" | "modal-trigger" | "accordion" | "drawer" | "menu" | "toggle" | "filter-sort";
export type RuntimeInteractionSkipReason =
  | "disabled"
  | "requires-input"
  | "destructive"
  | "unsafe-candidate"
  | "not-visible"
  | "route-change-risk"
  | "limit-reached"
  | "duplicate-state"
  | "unsupported-control";
export type RuntimeInteractionSource = {
  candidateId: string;
  kind: RuntimeInteractionControlKind;
  label: string;
  action: "click";
};
export type RuntimeSkippedInteraction = {
  candidateId: string;
  kind?: RuntimeInteractionControlKind;
  label?: string;
  reason: RuntimeInteractionSkipReason;
};

export type RuntimeScanError = {
  code: string;
  message: string;
  targetId?: string;
  route?: string;
  remediation?: string;
};

export type RuntimeRouteTarget = { id: string; kind: "route"; route: string };
export type RuntimeFlowStep =
  | { kind: "goto"; route: string }
  | { kind: "click"; selector: string; allowDestructive?: boolean }
  | { kind: "fill"; selector: string; value?: string; valueFromEnv?: string }
  | { kind: "waitForSelector"; selector: string }
  | { kind: "waitForTimeout"; timeoutMs: number }
  | { kind: "screenshotMarker"; label: string };
export type RuntimeStateTarget = { id: string; kind: "state"; name: string; route?: string; steps?: RuntimeFlowStep[] };
export type RuntimeFlowTarget = { id: string; kind: "flow"; name: string; route?: string; steps: RuntimeFlowStep[] };
export type RuntimeScanTarget = RuntimeRouteTarget | RuntimeStateTarget | RuntimeFlowTarget;
export type RuntimeDiscoveryMode = "all-routes" | "selected-routes" | "custom-targets";

export type RuntimeTextStyleEvidence = {
  foregroundColor: string;
  backgroundColor: string;
  fontSizePx: number;
  fontWeight: number;
  largeText: boolean;
};

export type RuntimeOklchColorEvidence = { l: number; c: number; h: number };
export type RuntimeOklchDeltaEvidence = { lightness: number; chroma: number; hue: number };

export type RuntimeReadabilitySkipReason =
  | "aria-hidden"
  | "text-shadow"
  | "background-image"
  | "transparent-ancestor"
  | "transparent-foreground"
  | "invalid-color"
  | "invalid-font-size"
  | "unsupported-effect";

export type RuntimeReadabilityCoverage = {
  candidateTextCount: number;
  checkedTextCount: number;
  skippedTextCount: number;
  skippedByReason: Partial<Record<RuntimeReadabilitySkipReason, number>>;
  incomplete: boolean;
};

export type RuntimeElementRect = { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number };

export type DomElementGeometry = {
  internalId: string;
  parentInternalId?: string;
  tagName: string;
  selectorHint?: string;
  id?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  textSnippet?: string;
  rect: RuntimeElementRect;
  visibility: { display: string; visibility: string; opacity: number };
  textStyle?: RuntimeTextStyleEvidence;
  focusBehavior?: {
    visibleOnFocus: boolean;
    rect?: RuntimeElementRect;
  };
  viewportBoundary?: {
    horizontal: "viewport" | "clipped-ancestor" | "scrollable-ancestor";
    vertical: "viewport" | "clipped-ancestor" | "scrollable-ancestor";
  };
  clickable: boolean;
  order: number;
};

export type DomGeometry = {
  viewport: RuntimeScanViewport;
  capturedAt: string;
  elementCount: number;
  truncated: boolean;
  readabilityCoverage?: RuntimeReadabilityCoverage;
  elements: DomElementGeometry[];
};

export type RuntimeLayoutIssueType =
  | "horizontal-overflow"
  | "element-outside-viewport"
  | "small-click-target"
  | "suspicious-overlap"
  | "zero-size-visible-element"
  | "low-text-contrast";

export type RuntimeLayoutIssue = {
  id: string;
  type: RuntimeLayoutIssueType;
  code: RuntimeLayoutIssueType;
  severity: "info" | "warning" | "error";
  message: string;
  scanTargetId: string;
  route: string;
  viewport: RuntimeScanViewport;
  elementRef: string;
  evidence: {
    selectorHint?: string;
    boundingBox: RuntimeElementRect;
    relatedElementRef?: string;
    relatedSelectorHint?: string;
    relatedBoundingBox?: RuntimeElementRect;
    overlapArea?: number;
    overlapRatio?: number;
    viewport: RuntimeScanViewport;
    screenshotPath?: string;
    threshold: string;
    foregroundColor?: string;
    backgroundColor?: string;
    contrastRatio?: number;
    requiredContrastRatio?: number;
    foregroundOklch?: RuntimeOklchColorEvidence;
    backgroundOklch?: RuntimeOklchColorEvidence;
    oklchDelta?: RuntimeOklchDeltaEvidence;
    suggestedForegroundColor?: string;
    suggestedBackgroundColor?: string;
    suggestionReason?: string;
  };
};

export type RuntimeViewportResult = {
  viewport: RuntimeScanViewport;
  stateId?: string;
  stateLabel?: string;
  stateDedupKey?: string;
  interactionSource?: RuntimeInteractionSource;
  skippedInteractions?: RuntimeSkippedInteraction[];
  screenshotPath?: string;
  screenshotError?: string;
  domGeometry?: DomGeometry;
  layoutIssues: RuntimeLayoutIssue[];
  error?: RuntimeScanError;
  consoleMessages?: RuntimeConsoleMessage[];
  pageErrors?: string[];
  networkErrors?: RuntimeNetworkError[];
  failedResponses?: RuntimeFailedResponse[];
};

export type RuntimeConsoleMessage = { type: string; text: string; location?: string };
export type RuntimeNetworkError = { url: string; method: string; failureText?: string };
export type RuntimeFailedResponse = { url: string; status: number; statusText: string };

export type RuntimeTargetResult = {
  targetId: string;
  target: RuntimeScanTarget;
  url?: string;
  status?: number;
  error?: RuntimeScanError;
  consoleMessages: RuntimeConsoleMessage[];
  pageErrors: string[];
  networkErrors: RuntimeNetworkError[];
  failedResponses: RuntimeFailedResponse[];
  viewportResults: RuntimeViewportResult[];
  executionSteps?: {
    kind: RuntimeFlowStep["kind"];
    selector?: string;
    status: "passed" | "failed";
    durationMs: number;
    redacted?: boolean;
    valueSource?: "direct" | "env";
    valueFromEnv?: string;
    code?: string;
    message?: string;
  }[];
  durationMs: number;
};

export type RuntimeRouteResult = RuntimeTargetResult & {
  route: string;
  screenshotPath?: string;
  screenshotError?: string;
};

export type RuntimeScanSummary = {
  routeCount: number;
  targetCount: number;
  consoleMessageCount: number;
  pageErrorCount: number;
  networkErrorCount: number;
  failedResponseCount: number;
  screenshotCount: number;
  errorCount: number;
};

export type RuntimeArtifactMeta = {
  schemaVersion: typeof RUNTIME_SCAN_SCHEMA_VERSION;
  scanId: string;
  generatedAt: string;
  projectRoot: string;
  selectedRoot: string;
};

export type RuntimeScanArtifacts = { rootDir: string; screenshotsDir: string; resultPath: string };

export type RuntimeScanResult = RuntimeArtifactMeta & {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  targets: RuntimeScanTarget[];
  routes: RuntimeRouteResult[];
  limits: RuntimeScanLimits;
  errors: RuntimeScanError[];
  summary: RuntimeScanSummary;
  artifacts: RuntimeScanArtifacts;
  targetDiscovery?: {
    mode: RuntimeDiscoveryMode;
    targetIds: string[];
    reason: string;
  };
  routeDiscovery: {
    routes: string[];
    source: "request" | "production-graph" | "fallback";
    mode?: RuntimeDiscoveryMode;
    reason: string;
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => Number.isFinite(value);
const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;
const isHexColor = (value: unknown): value is string => isString(value) && /^#[0-9a-f]{6}$/i.test(value);
const isContrastRatio = (value: unknown): value is number => isNumber(value) && value >= 1 && value <= 21;
const isRequiredContrastRatio = (value: unknown): value is 3 | 4.5 => value === 3 || value === 4.5;
const assertRuntimeOklchColorSafe = (value: unknown): void => {
  if (!isObject(value)) throw new Error("Runtime OKLCH color must be object");
  assertKnownFields(value, ["l", "c", "h"], "Runtime OKLCH color");
  if (!isNumber(value.l) || value.l < 0 || value.l > 1 || !isNumber(value.c) || value.c < 0 || !isNumber(value.h) || value.h < 0 || value.h >= 360) throw new Error("Runtime OKLCH color invalid");
};
const assertRuntimeOklchDeltaSafe = (value: unknown): void => {
  if (!isObject(value)) throw new Error("Runtime OKLCH delta must be object");
  assertKnownFields(value, ["lightness", "chroma", "hue"], "Runtime OKLCH delta");
  if (!isNumber(value.lightness) || value.lightness < 0 || value.lightness > 1 || !isNumber(value.chroma) || value.chroma < 0 || !isNumber(value.hue) || value.hue < 0 || value.hue > 180) throw new Error("Runtime OKLCH delta invalid");
};
const assertKnownFields = (value: Record<string, unknown>, allowed: readonly string[], label: string): void => {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${label} unknown fields: ${unknown.join(", ")}`);
};

const isRuntimeInteractionSkipReason = (value: unknown): value is RuntimeInteractionSkipReason =>
  value === "disabled" || value === "requires-input" || value === "destructive" || value === "unsafe-candidate" || value === "not-visible" || value === "route-change-risk" || value === "limit-reached" || value === "duplicate-state" || value === "unsupported-control";

const isRuntimeInteractionControlKind = (value: unknown): value is RuntimeInteractionControlKind =>
  value === "tab" || value === "dropdown" || value === "modal-trigger" || value === "accordion" || value === "drawer" || value === "menu" || value === "toggle" || value === "filter-sort";

const isRuntimeReadabilitySkipReason = (value: unknown): value is RuntimeReadabilitySkipReason =>
  value === "aria-hidden" || value === "text-shadow" || value === "background-image" || value === "transparent-ancestor" || value === "transparent-foreground" || value === "invalid-color" || value === "invalid-font-size" || value === "unsupported-effect";

const assertRuntimeReadabilityCoverageSafe = (coverage: unknown): void => {
  if (!isObject(coverage)) throw new Error("Runtime readability coverage must be object");
  assertKnownFields(coverage, ["candidateTextCount", "checkedTextCount", "skippedTextCount", "skippedByReason", "incomplete"], "Runtime readability coverage");
  if (!isCount(coverage.candidateTextCount) || !isCount(coverage.checkedTextCount) || !isCount(coverage.skippedTextCount) || typeof coverage.incomplete !== "boolean" || !isObject(coverage.skippedByReason)) throw new Error("Runtime readability coverage fields invalid");
  if (coverage.candidateTextCount !== coverage.checkedTextCount + coverage.skippedTextCount) throw new Error("Runtime readability coverage count mismatch");
  let skippedTotal = 0;
  for (const [reason, count] of Object.entries(coverage.skippedByReason)) {
    if (!isRuntimeReadabilitySkipReason(reason) || !isCount(count)) throw new Error("Runtime readability skip reason invalid");
    skippedTotal += count;
  }
  if (skippedTotal !== coverage.skippedTextCount) throw new Error("Runtime readability skipped count mismatch");
};

const assertRuntimeViewportSafe = (viewport: unknown): void => {
  if (!isObject(viewport)) throw new Error("Runtime viewport must be object");
  assertKnownFields(viewport, ["width", "height", "name"], "Runtime viewport");
  if (!Number.isInteger(viewport.width) || Number(viewport.width) <= 0 || !Number.isInteger(viewport.height) || Number(viewport.height) <= 0) throw new Error("Runtime viewport invalid");
  if (viewport.name !== undefined && viewport.name !== "mobile" && viewport.name !== "tablet" && viewport.name !== "desktop" && viewport.name !== "custom") throw new Error("Runtime viewport name invalid");
};

const assertRuntimeRectSafe = (rect: unknown): void => {
  if (!isObject(rect)) throw new Error("Runtime rect must be object");
  assertKnownFields(rect, ["x", "y", "width", "height", "top", "right", "bottom", "left"], "Runtime rect");
  for (const field of ["x", "y", "width", "height", "top", "right", "bottom", "left"] as const) {
    if (!isNumber(rect[field])) throw new Error(`Runtime rect ${field} invalid`);
  }
  if (Number(rect.width) < 0 || Number(rect.height) < 0) throw new Error("Runtime rect dimensions invalid");
};

const assertRuntimeDomGeometrySafe = (geometry: unknown): void => {
  if (!isObject(geometry)) throw new Error("Runtime scan domGeometry must be object");
  assertKnownFields(geometry, ["viewport", "capturedAt", "elementCount", "truncated", "readabilityCoverage", "elements"], "Runtime scan domGeometry");
  assertRuntimeViewportSafe(geometry.viewport);
  if (!isString(geometry.capturedAt) || !isCount(geometry.elementCount) || typeof geometry.truncated !== "boolean" || !Array.isArray(geometry.elements)) throw new Error("Runtime scan domGeometry fields invalid");
  if (geometry.elementCount !== geometry.elements.length) throw new Error("Runtime scan domGeometry element count mismatch");
  if (geometry.readabilityCoverage !== undefined) {
    assertRuntimeReadabilityCoverageSafe(geometry.readabilityCoverage);
    if (isObject(geometry.readabilityCoverage) && geometry.readabilityCoverage.incomplete !== geometry.truncated) throw new Error("Runtime scan readability completeness mismatch");
  }
  for (const element of geometry.elements) {
    if (!isObject(element)) throw new Error("Runtime scan DOM element must be object");
    assertKnownFields(element, ["internalId", "parentInternalId", "tagName", "selectorHint", "id", "className", "role", "ariaLabel", "textSnippet", "rect", "visibility", "textStyle", "focusBehavior", "viewportBoundary", "clickable", "order"], "Runtime scan DOM element");
    if (!isString(element.internalId) || !isString(element.tagName) || typeof element.clickable !== "boolean" || !isCount(element.order)) throw new Error("Runtime scan DOM element fields invalid");
    assertRuntimeRectSafe(element.rect);
    if (!isObject(element.visibility)) throw new Error("Runtime scan DOM visibility invalid");
    assertKnownFields(element.visibility, ["display", "visibility", "opacity"], "Runtime scan DOM visibility");
    if (!isString(element.visibility.display) || !isString(element.visibility.visibility) || !isNumber(element.visibility.opacity) || element.visibility.opacity < 0 || element.visibility.opacity > 1) throw new Error("Runtime scan DOM visibility invalid");
    for (const text of [element.textSnippet, element.ariaLabel]) {
      if (text !== undefined && (!isString(text) || redactRuntimeTextEvidence(text) !== text)) throw new Error("Runtime scan DOM text evidence must be redacted");
    }
    if (element.textStyle !== undefined) {
      if (!isObject(element.textStyle)) throw new Error("Runtime scan text style must be object");
      assertKnownFields(element.textStyle, ["foregroundColor", "backgroundColor", "fontSizePx", "fontWeight", "largeText"], "Runtime scan text style");
      if (!isHexColor(element.textStyle.foregroundColor) || !isHexColor(element.textStyle.backgroundColor) || !isNumber(element.textStyle.fontSizePx) || element.textStyle.fontSizePx <= 0 || !isNumber(element.textStyle.fontWeight) || element.textStyle.fontWeight < 1 || element.textStyle.fontWeight > 1000 || typeof element.textStyle.largeText !== "boolean") throw new Error("Runtime scan text style invalid");
      const expectedLargeText = element.textStyle.fontSizePx >= WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX || (element.textStyle.fontSizePx >= WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX && element.textStyle.fontWeight >= WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT);
      if (element.textStyle.largeText !== expectedLargeText) throw new Error("Runtime scan large text classification invalid");
    }
    if (element.focusBehavior !== undefined) {
      if (!isObject(element.focusBehavior)) throw new Error("Runtime scan focus behavior must be object");
      assertKnownFields(element.focusBehavior, ["visibleOnFocus", "rect"], "Runtime scan focus behavior");
      if (typeof element.focusBehavior.visibleOnFocus !== "boolean") throw new Error("Runtime scan focus behavior invalid");
      if (element.focusBehavior.rect !== undefined) assertRuntimeRectSafe(element.focusBehavior.rect);
    }
  }
};

const assertRuntimeTargetSafe = (target: unknown): void => {
  if (!isObject(target)) throw new Error("Runtime scan target must be object");
  if (target.kind !== "route" && target.kind !== "state" && target.kind !== "flow") throw new Error("Runtime scan target kind invalid");
  if (Array.isArray(target.steps)) {
    for (const step of target.steps) {
      if (isObject(step) && step.kind === "fill" && "value" in step) throw new Error("Runtime scan artifact fill values must be redacted");
    }
  }
};

const isRuntimeLayoutIssueType = (value: unknown): value is RuntimeLayoutIssueType =>
  value === "horizontal-overflow" ||
  value === "element-outside-viewport" ||
  value === "small-click-target" ||
  value === "suspicious-overlap" ||
  value === "zero-size-visible-element" ||
  value === "low-text-contrast";

const assertRuntimeLayoutIssueSafe = (issue: unknown): void => {
  if (!isObject(issue)) throw new Error("Runtime layout issue must be object");
  assertKnownFields(issue, ["id", "type", "code", "severity", "message", "scanTargetId", "route", "viewport", "elementRef", "evidence"], "Runtime layout issue");
  if (!isRuntimeLayoutIssueType(issue.type)) throw new Error("Runtime layout issue type invalid");
  if (issue.code !== issue.type) throw new Error("Runtime layout issue code must equal type");
  if (!isString(issue.scanTargetId)) throw new Error("Runtime layout issue scanTargetId must be string");
  if (!isString(issue.elementRef)) throw new Error("Runtime layout issue elementRef must be string");
  if (!isString(issue.id) || !isString(issue.message) || !isString(issue.route) || (issue.severity !== "info" && issue.severity !== "warning" && issue.severity !== "error")) throw new Error("Runtime layout issue fields invalid");
  assertRuntimeViewportSafe(issue.viewport);
  if (!isObject(issue.evidence)) throw new Error("Runtime layout issue evidence must be object");
  assertKnownFields(issue.evidence, ["selectorHint", "boundingBox", "relatedElementRef", "relatedSelectorHint", "relatedBoundingBox", "overlapArea", "overlapRatio", "viewport", "screenshotPath", "threshold", "foregroundColor", "backgroundColor", "contrastRatio", "requiredContrastRatio", "foregroundOklch", "backgroundOklch", "oklchDelta", "suggestedForegroundColor", "suggestedBackgroundColor", "suggestionReason"], "Runtime layout issue evidence");
  if (!isString(issue.evidence.threshold)) throw new Error("Runtime layout issue threshold invalid");
  assertRuntimeRectSafe(issue.evidence.boundingBox);
  assertRuntimeViewportSafe(issue.evidence.viewport);
  const hasContrastEvidence = issue.evidence.foregroundColor !== undefined || issue.evidence.backgroundColor !== undefined || issue.evidence.contrastRatio !== undefined || issue.evidence.requiredContrastRatio !== undefined;
  if (hasContrastEvidence && (!isHexColor(issue.evidence.foregroundColor) || !isHexColor(issue.evidence.backgroundColor) || !isContrastRatio(issue.evidence.contrastRatio) || !isRequiredContrastRatio(issue.evidence.requiredContrastRatio) || issue.evidence.contrastRatio >= issue.evidence.requiredContrastRatio)) throw new Error("Runtime layout contrast evidence invalid");
  const hasOklchEvidence = issue.evidence.foregroundOklch !== undefined || issue.evidence.backgroundOklch !== undefined || issue.evidence.oklchDelta !== undefined;
  if (hasOklchEvidence) {
    assertRuntimeOklchColorSafe(issue.evidence.foregroundOklch);
    assertRuntimeOklchColorSafe(issue.evidence.backgroundOklch);
    assertRuntimeOklchDeltaSafe(issue.evidence.oklchDelta);
  }
  const hasSuggestion = issue.evidence.suggestedForegroundColor !== undefined || issue.evidence.suggestedBackgroundColor !== undefined || issue.evidence.suggestionReason !== undefined;
  if (hasSuggestion && ((!isHexColor(issue.evidence.suggestedForegroundColor) && !isHexColor(issue.evidence.suggestedBackgroundColor)) || !isString(issue.evidence.suggestionReason) || issue.evidence.suggestionReason.length === 0)) throw new Error("Runtime layout contrast suggestion invalid");
  if (isHexColor(issue.evidence.suggestedForegroundColor) && isHexColor(issue.evidence.backgroundColor) && isRequiredContrastRatio(issue.evidence.requiredContrastRatio) && (wcagContrastRatio(issue.evidence.suggestedForegroundColor, issue.evidence.backgroundColor) ?? 0) < issue.evidence.requiredContrastRatio) throw new Error("Runtime suggested foreground contrast invalid");
  if (isHexColor(issue.evidence.suggestedBackgroundColor) && isHexColor(issue.evidence.foregroundColor) && isRequiredContrastRatio(issue.evidence.requiredContrastRatio) && (wcagContrastRatio(issue.evidence.foregroundColor, issue.evidence.suggestedBackgroundColor) ?? 0) < issue.evidence.requiredContrastRatio) throw new Error("Runtime suggested background contrast invalid");
  if (issue.type === "low-text-contrast" && !hasContrastEvidence) throw new Error("Runtime low contrast evidence required");
  if (issue.type !== "low-text-contrast" && (hasContrastEvidence || hasOklchEvidence || hasSuggestion)) throw new Error("Runtime contrast evidence issue type invalid");
};

export const validateRuntimeScanResult = (value: unknown): RuntimeScanResult => {
  if (!isObject(value)) throw new Error("Runtime scan artifact must be an object");
  if (value.schemaVersion !== RUNTIME_SCAN_SCHEMA_VERSION) throw new Error("Runtime scan artifact schemaVersion mismatch");
  if (!isString(value.scanId)) throw new Error("Runtime scan artifact scanId must be string");
  if (!isString(value.generatedAt)) throw new Error("Runtime scan artifact generatedAt must be string");
  if (!isString(value.projectRoot)) throw new Error("Runtime scan artifact projectRoot must be string");
  if (!isString(value.selectedRoot)) throw new Error("Runtime scan artifact selectedRoot must be string");
  if (!Array.isArray(value.targets)) throw new Error("Runtime scan artifact targets must be array");
  if (!Array.isArray(value.routes)) throw new Error("Runtime scan artifact routes must be array");
  if (!Array.isArray(value.errors)) throw new Error("Runtime scan artifact errors must be array");
  for (const target of value.targets) assertRuntimeTargetSafe(target);
  if (!isObject(value.limits)) throw new Error("Runtime scan artifact limits must be object");
  for (const key of ["maxRoutes", "maxTargets", "maxElementsPerViewport", "maxTextSnippetLength", "routeTimeoutMs", "scanTimeoutMs", "maxInteractionsPerRoute", "maxStatesPerRoute", "interactionDiscoveryTimeoutMs"]) {
    if (!isNumber(value.limits[key])) throw new Error(`Runtime scan limit ${key} must be number`);
  }
  if (!Array.isArray(value.limits.ignoredTags)) throw new Error("Runtime scan ignoredTags must be array");
  if (!isObject(value.summary)) throw new Error("Runtime scan summary must be object");
  for (const route of value.routes) {
    if (!isObject(route)) throw new Error("Runtime scan route result must be object");
    if ("target" in route) assertRuntimeTargetSafe(route.target);
    if (!Array.isArray(route.viewportResults)) throw new Error("Runtime scan viewportResults must be array");
    for (const viewportResult of route.viewportResults) {
      if (!isObject(viewportResult)) throw new Error("Runtime scan viewport result must be object");
      assertKnownFields(viewportResult, ["viewport", "stateId", "stateLabel", "stateDedupKey", "interactionSource", "skippedInteractions", "screenshotPath", "screenshotError", "domGeometry", "layoutIssues", "error", "consoleMessages", "pageErrors", "networkErrors", "failedResponses"], "Runtime scan viewport result");
      assertRuntimeViewportSafe(viewportResult.viewport);
      const stateFieldCount = [viewportResult.stateId, viewportResult.stateLabel, viewportResult.stateDedupKey].filter(isString).length;
      if (stateFieldCount !== 0 && stateFieldCount !== 3) throw new Error("Runtime scan viewport state identity invalid");
      if (viewportResult.skippedInteractions !== undefined) {
        if (!Array.isArray(viewportResult.skippedInteractions)) throw new Error("Runtime scan skippedInteractions must be array");
        for (const skipped of viewportResult.skippedInteractions) {
          if (!isObject(skipped)) throw new Error("Runtime scan skipped interaction must be object");
          assertKnownFields(skipped, ["candidateId", "kind", "label", "reason"], "Runtime scan skipped interaction");
          if (!isString(skipped.candidateId) || (skipped.kind !== undefined && !isRuntimeInteractionControlKind(skipped.kind)) || !isRuntimeInteractionSkipReason(skipped.reason)) throw new Error("Runtime scan skipped interaction invalid");
        }
      }
      if ("domGeometry" in viewportResult) {
        assertRuntimeDomGeometrySafe(viewportResult.domGeometry);
      }
      if (!Array.isArray(viewportResult.layoutIssues)) throw new Error("Runtime scan layoutIssues must be array");
      for (const layoutIssue of viewportResult.layoutIssues) assertRuntimeLayoutIssueSafe(layoutIssue);
    }
  }
  return value as RuntimeScanResult;
};
