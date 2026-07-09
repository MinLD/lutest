"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProductionGraphResponse = exports.validateProductionGraphEdge = exports.validateProductionGraphNode = exports.validateScanResponse = exports.validateLatestReportResponse = exports.validateArtifactRef = exports.validateRuntimeArtifactMeta = exports.validateRuntimeScanResult = exports.validateRuntimeLayoutIssue = exports.validateDomGeometry = exports.validateLatestReportQuery = exports.validateGraphQuery = exports.validateProjectPathQuery = exports.validateScanRequest = exports.validateRuntimeScanRequest = void 0;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0;
const isOptionalNonEmptyString = (value) => value === undefined || isNonEmptyString(value);
const isErrorCode = (value) => value === "INVALID_REQUEST" ||
    value === "NOT_FOUND" ||
    value === "INTERNAL_ERROR" ||
    value === "SCHEMA_INVALID" ||
    value === "PATH_NOT_ALLOWED" ||
    value === "CONFIG_ERROR" ||
    value === "BASE_URL_NOT_LOCAL" ||
    value === "PLAYWRIGHT_BROWSER_MISSING" ||
    value === "PLAYWRIGHT_BROWSER_LAUNCH_FAILED" ||
    value === "ROUTE_DISCOVERY_ERROR" ||
    value === "TARGET_EXECUTION_ERROR" ||
    value === "ROUTE_SCAN_ERROR" ||
    value === "ARTIFACT_WRITE_ERROR" ||
    value === "RUNTIME_SCAN_FAILED" ||
    value === "REPORT_MALFORMED" ||
    value === "REPORT_SCHEMA_INVALID" ||
    value === "REPORT_PERMISSION_DENIED";
const isScanIssueType = (value) => value === "console" ||
    value === "syntax" ||
    value === "overflow" ||
    value === "todo" ||
    value === "large-file" ||
    value === "maintainability" ||
    value === "unknown";
const isScanIssueSeverity = (value) => value === "info" || value === "warning" || value === "error";
const isLatestReportState = (value) => value === "missing" ||
    value === "valid";
const isScanStatus = (value) => value === "passed" || value === "failed" || value === "warning";
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isOptionalString = (value) => value === undefined || isString(value);
const runtimeInvalid = (message) => ({ ok: false, code: "SCHEMA_INVALID", message });
const validateLocalRuntimeBaseUrl = (baseUrl) => {
    if (!isNonEmptyString(baseUrl))
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.baseUrl must be a non-empty string" };
    let parsed;
    try {
        parsed = new URL(baseUrl);
    }
    catch {
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.baseUrl is invalid" };
    }
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.baseUrl must be a local HTTP(S) URL" };
    }
    return { ok: true, value: parsed.toString().replace(/\/$/, "") };
};
const isLocalRoute = (value) => isNonEmptyString(value) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) && !value.startsWith("//") && !value.includes("\0");
const isRuntimeDiscoveryMode = (value) => value === "all-routes" || value === "selected-routes" || value === "custom-targets";
const isRuntimeLayoutIssueType = (value) => value === "horizontal-overflow" || value === "element-outside-viewport" || value === "small-click-target" || value === "suspicious-overlap" || value === "zero-size-visible-element";
const isRuntimeErrorCode = (value) => value === "CONFIG_ERROR" || value === "PATH_NOT_ALLOWED" || value === "BASE_URL_NOT_LOCAL" || value === "PLAYWRIGHT_BROWSER_MISSING" || value === "PLAYWRIGHT_BROWSER_LAUNCH_FAILED" || value === "ROUTE_DISCOVERY_ERROR" || value === "TARGET_EXECUTION_ERROR" || value === "ROUTE_SCAN_ERROR" || value === "ARTIFACT_WRITE_ERROR" || value === "RUNTIME_SCAN_FAILED" || value === "RUNTIME_BASE_URL_NOT_ALLOWED" || value === "RUNTIME_SCAN_ARTIFACT_INVALID" || value === "RUNTIME_SCAN_ARTIFACT_MALFORMED" || value === "RUNTIME_FLOW_ENV_VALUE_MISSING" || value === "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED" || value === "RUNTIME_LAYOUT_ISSUE_DETECTION_FAILED";
const isSafeId = (value) => isNonEmptyString(value) && /^[a-zA-Z0-9._:-]+$/.test(value) && !value.includes("..");
const isSafeEnvName = (value) => isNonEmptyString(value) && /^[A-Z_][A-Z0-9_]*$/.test(value);
const validateRuntimeFlowStep = (value) => {
    if (!isRecord(value))
        return { ok: false, code: "INVALID_REQUEST", message: "runtime flow step must be an object" };
    const stepKeys = rejectUnknownKeys(value, ["kind", "route", "selector", "allowDestructive", "value", "valueFromEnv", "timeoutMs", "label"]);
    if (!stepKeys.ok)
        return stepKeys;
    if (value.kind === "goto")
        return isLocalRoute(value.route) ? { ok: true, value: { kind: "goto", route: value.route } } : { ok: false, code: "INVALID_REQUEST", message: "goto.route must be local" };
    if (value.kind === "click") {
        if (!isNonEmptyString(value.selector))
            return { ok: false, code: "INVALID_REQUEST", message: "click.selector is required" };
        if (/delete|remove|logout|log-out|signout|sign-out|submit|save|confirm|danger|destructive/i.test(value.selector) && value.allowDestructive !== true)
            return { ok: false, code: "INVALID_REQUEST", message: "destructive click requires allowDestructive" };
        return { ok: true, value: { kind: "click", selector: value.selector, allowDestructive: value.allowDestructive === true ? true : undefined } };
    }
    if (value.kind === "fill") {
        if (!isNonEmptyString(value.selector))
            return { ok: false, code: "INVALID_REQUEST", message: "fill.selector is required" };
        if (value.value !== undefined && !isString(value.value))
            return { ok: false, code: "INVALID_REQUEST", message: "fill.value must be a string" };
        if (value.valueFromEnv !== undefined && !isSafeEnvName(value.valueFromEnv))
            return { ok: false, code: "INVALID_REQUEST", message: "fill.valueFromEnv is invalid" };
        if (value.value === undefined && value.valueFromEnv === undefined)
            return { ok: false, code: "INVALID_REQUEST", message: "fill requires value or valueFromEnv" };
        return { ok: true, value: { kind: "fill", selector: value.selector, value: value.value, valueFromEnv: value.valueFromEnv } };
    }
    if (value.kind === "waitForSelector")
        return isNonEmptyString(value.selector) ? { ok: true, value: { kind: "waitForSelector", selector: value.selector } } : { ok: false, code: "INVALID_REQUEST", message: "waitForSelector.selector is required" };
    if (value.kind === "waitForTimeout") {
        const timeoutMs = value.timeoutMs;
        return typeof timeoutMs === "number" && Number.isInteger(timeoutMs) && timeoutMs >= 0 && timeoutMs <= 10_000 ? { ok: true, value: { kind: "waitForTimeout", timeoutMs } } : { ok: false, code: "INVALID_REQUEST", message: "waitForTimeout.timeoutMs must be 0..10000" };
    }
    if (value.kind === "screenshotMarker")
        return isNonEmptyString(value.label) ? { ok: true, value: { kind: "screenshotMarker", label: value.label } } : { ok: false, code: "INVALID_REQUEST", message: "screenshotMarker.label is required" };
    return { ok: false, code: "INVALID_REQUEST", message: "runtime flow step kind is invalid" };
};
const validateRuntimeResultFlowStep = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime result flow step must be an object");
    const stepKeys = rejectUnknownKeys(value, ["kind", "route", "selector", "allowDestructive", "redacted", "valueSource", "valueFromEnv", "timeoutMs", "label"]);
    if (!stepKeys.ok)
        return stepKeys;
    if (value.kind === "fill") {
        if (!isNonEmptyString(value.selector) || value.redacted !== true)
            return runtimeInvalid("runtime result fill step must be redacted");
        if (value.valueSource !== undefined && value.valueSource !== "direct" && value.valueSource !== "env")
            return runtimeInvalid("runtime result fill valueSource invalid");
        if (value.valueFromEnv !== undefined && !isSafeEnvName(value.valueFromEnv))
            return runtimeInvalid("runtime result fill valueFromEnv invalid");
        return { ok: true, value: { kind: "fill", selector: value.selector, redacted: true, valueSource: value.valueSource, valueFromEnv: value.valueFromEnv } };
    }
    return validateRuntimeFlowStep(value);
};
const validateRuntimeTarget = (value) => {
    if (!isRecord(value))
        return { ok: false, code: "INVALID_REQUEST", message: "runtime target must be an object" };
    const keys = rejectUnknownKeys(value, ["id", "kind", "route", "name", "steps"]);
    if (!keys.ok)
        return keys;
    if (!isSafeId(value.id))
        return { ok: false, code: "INVALID_REQUEST", message: "runtime target id is invalid" };
    if (!isLocalRoute(value.route))
        return { ok: false, code: "INVALID_REQUEST", message: "runtime target route must be local" };
    const name = isOptionalString(value.name) ? value.name : undefined;
    if (value.kind === "route")
        return { ok: true, value: { id: value.id, kind: "route", route: value.route, name } };
    if (value.kind === "state" || value.kind === "flow") {
        if (!Array.isArray(value.steps))
            return { ok: false, code: "INVALID_REQUEST", message: "runtime target steps must be an array" };
        const steps = [];
        for (const rawStep of value.steps) {
            const step = validateRuntimeFlowStep(rawStep);
            if (!step.ok)
                return step;
            steps.push(step.value);
        }
        return { ok: true, value: { id: value.id, kind: value.kind, route: value.route, name, steps } };
    }
    return { ok: false, code: "INVALID_REQUEST", message: "runtime target kind is invalid" };
};
const validateRuntimeResultTarget = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime result target must be an object");
    const keys = rejectUnknownKeys(value, ["id", "kind", "route", "name", "steps"]);
    if (!keys.ok)
        return keys;
    if (!isSafeId(value.id) || !isLocalRoute(value.route))
        return runtimeInvalid("runtime result target identity invalid");
    const name = isOptionalString(value.name) ? value.name : undefined;
    if (value.kind === "route")
        return { ok: true, value: { id: value.id, kind: "route", route: value.route, name } };
    if (value.kind === "state" || value.kind === "flow") {
        if (!Array.isArray(value.steps))
            return runtimeInvalid("runtime result target steps must be array");
        const steps = [];
        for (const rawStep of value.steps) {
            const step = validateRuntimeResultFlowStep(rawStep);
            if (!step.ok)
                return step;
            steps.push(step.value);
        }
        return { ok: true, value: { id: value.id, kind: value.kind, route: value.route, name, steps } };
    }
    return runtimeInvalid("runtime result target kind invalid");
};
const validateRuntimeScanRequest = (value) => {
    if (!isRecord(value))
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan must be an object" };
    const keys = rejectUnknownKeys(value, ["enabled", "baseUrl", "routes", "targets", "discoveryMode", "viewportPreset"]);
    if (!keys.ok)
        return keys;
    if (value.enabled !== true)
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.enabled must be true" };
    const baseUrl = validateLocalRuntimeBaseUrl(value.baseUrl);
    if (!baseUrl.ok)
        return baseUrl;
    const routes = value.routes === undefined ? undefined : Array.isArray(value.routes) && value.routes.every(isLocalRoute) ? value.routes : undefined;
    if (value.routes !== undefined && routes === undefined)
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.routes must be local routes" };
    const targets = value.targets === undefined ? undefined : [];
    if (value.targets !== undefined) {
        if (!Array.isArray(value.targets))
            return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.targets must be an array" };
        for (const rawTarget of value.targets) {
            const target = validateRuntimeTarget(rawTarget);
            if (!target.ok)
                return target;
            targets?.push(target.value);
        }
    }
    if (value.discoveryMode !== undefined && !isRuntimeDiscoveryMode(value.discoveryMode))
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.discoveryMode is invalid" };
    if (value.viewportPreset !== undefined && value.viewportPreset !== "default")
        return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.viewportPreset is invalid" };
    return { ok: true, value: { enabled: true, baseUrl: baseUrl.value, routes, targets, discoveryMode: value.discoveryMode, viewportPreset: value.viewportPreset } };
};
exports.validateRuntimeScanRequest = validateRuntimeScanRequest;
const isProductionGraphNodeKind = (value) => value === "file" ||
    value === "page" ||
    value === "component" ||
    value === "hook" ||
    value === "api-route" ||
    value === "api-client-method" ||
    value === "utility" ||
    value === "external-endpoint";
const isProductionGraphEdgeKind = (value) => value === "import" ||
    value === "render" ||
    value === "call" ||
    value === "http" ||
    value === "route";
const isGraphConfidence = (value) => value === "high" || value === "medium" || value === "low";
const rejectUnknownKeys = (value, allowedKeys) => {
    const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
    if (unknownKeys.length > 0) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: `Unknown request fields: ${unknownKeys.join(", ")}`,
            details: { unknownKeys },
        };
    }
    return { ok: true, value: undefined };
};
const validateScanRequest = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "Request body must be an object",
        };
    }
    const keys = rejectUnknownKeys(value, ["projectPath", "runtimeScan"]);
    if (!keys.ok)
        return keys;
    const projectPath = value.projectPath;
    if (!isOptionalNonEmptyString(projectPath)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "projectPath must be a non-empty string",
        };
    }
    const runtimeScan = value.runtimeScan === undefined ? undefined : (0, exports.validateRuntimeScanRequest)(value.runtimeScan);
    if (runtimeScan && !runtimeScan.ok)
        return runtimeScan;
    return {
        ok: true,
        value: { projectPath, ...(runtimeScan ? { runtimeScan: runtimeScan.value } : {}) },
    };
};
exports.validateScanRequest = validateScanRequest;
const validateProjectPathQuery = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "Query must be an object",
        };
    }
    const keys = rejectUnknownKeys(value, ["path", "projectPath"]);
    if (!keys.ok)
        return keys;
    if (value.path !== undefined && value.projectPath !== undefined) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "Use either path or projectPath, not both",
        };
    }
    const projectPath = value.path ?? value.projectPath;
    if (Array.isArray(projectPath)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "path query must be a single string",
        };
    }
    if (!isOptionalNonEmptyString(projectPath)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "path query must be a non-empty string",
        };
    }
    return { ok: true, value: { path: projectPath, projectPath } };
};
exports.validateProjectPathQuery = validateProjectPathQuery;
exports.validateGraphQuery = exports.validateProjectPathQuery;
exports.validateLatestReportQuery = exports.validateProjectPathQuery;
const validateProjectSummary = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "project must be an object",
        };
    }
    if (!isNonEmptyString(value.name)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "project.name must be a non-empty string" };
    }
    if (!isNonEmptyString(value.rootDir)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "project.rootDir must be a non-empty string" };
    }
    if (!isNonEmptyString(value.lutestDir)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "project.lutestDir must be a non-empty string" };
    }
    if (typeof value.packageJsonExists !== "boolean") {
        return { ok: false, code: "SCHEMA_INVALID", message: "project.packageJsonExists must be a boolean" };
    }
    if (value.detectedFramework !== "next" &&
        value.detectedFramework !== "vite-react" &&
        value.detectedFramework !== "react" &&
        value.detectedFramework !== "vue" &&
        value.detectedFramework !== "laravel" &&
        value.detectedFramework !== "php" &&
        value.detectedFramework !== "unknown" &&
        value.detectedFramework !== null) {
        return { ok: false, code: "SCHEMA_INVALID", message: "project.detectedFramework is invalid" };
    }
    if (value.sourceFileCount !== undefined &&
        typeof value.sourceFileCount !== "number") {
        return { ok: false, code: "SCHEMA_INVALID", message: "project.sourceFileCount must be a number" };
    }
    return {
        ok: true,
        value: {
            name: value.name,
            rootDir: value.rootDir,
            lutestDir: value.lutestDir,
            packageJsonExists: value.packageJsonExists,
            detectedFramework: value.detectedFramework,
            sourceFileCount: value.sourceFileCount,
        },
    };
};
const validateScanIssue = (value) => {
    if (!isRecord(value)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "issue must be an object" };
    }
    if (!isNonEmptyString(value.id)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "issue.id must be a non-empty string" };
    }
    if (!isScanIssueType(value.type)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "issue.type is invalid" };
    }
    if (!isScanIssueSeverity(value.severity)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "issue.severity is invalid" };
    }
    if (!isNonEmptyString(value.message)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "issue.message must be a non-empty string" };
    }
    if (!isOptionalNonEmptyString(value.filePath)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "issue.filePath must be a non-empty string" };
    }
    return {
        ok: true,
        value: {
            id: value.id,
            type: value.type,
            severity: value.severity,
            message: value.message,
            filePath: value.filePath,
        },
    };
};
const validateRuntimeViewport = (value) => {
    if (!isRecord(value) || !isFiniteNumber(value.width) || !isFiniteNumber(value.height))
        return runtimeInvalid("runtime viewport is invalid");
    return { ok: true, value: { width: value.width, height: value.height } };
};
const validateRuntimeRect = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime rect must be an object");
    const { x, y, width, height, top, right, bottom, left } = value;
    if (!isFiniteNumber(x))
        return runtimeInvalid("runtime rect.x must be finite");
    if (!isFiniteNumber(y))
        return runtimeInvalid("runtime rect.y must be finite");
    if (!isFiniteNumber(width))
        return runtimeInvalid("runtime rect.width must be finite");
    if (!isFiniteNumber(height))
        return runtimeInvalid("runtime rect.height must be finite");
    if (!isFiniteNumber(top))
        return runtimeInvalid("runtime rect.top must be finite");
    if (!isFiniteNumber(right))
        return runtimeInvalid("runtime rect.right must be finite");
    if (!isFiniteNumber(bottom))
        return runtimeInvalid("runtime rect.bottom must be finite");
    if (!isFiniteNumber(left))
        return runtimeInvalid("runtime rect.left must be finite");
    return { ok: true, value: { x, y, width, height, top, right, bottom, left } };
};
const validateDomElementGeometry = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("dom element must be object");
    if (!isNonEmptyString(value.internalId) || !isNonEmptyString(value.tagName))
        return runtimeInvalid("dom element identity invalid");
    if (!isOptionalString(value.selectorHint) || !isOptionalString(value.textSnippet) || (isString(value.textSnippet) && value.textSnippet.length > 500))
        return runtimeInvalid("dom element text/selector invalid");
    const rect = validateRuntimeRect(value.rect);
    if (!rect.ok)
        return rect;
    if (!isRecord(value.visibility) || !isString(value.visibility.display) || !isString(value.visibility.visibility) || !isFiniteNumber(value.visibility.opacity))
        return runtimeInvalid("dom element visibility invalid");
    if (typeof value.clickable !== "boolean" || !isFiniteNumber(value.order))
        return runtimeInvalid("dom element clickable/order invalid");
    return { ok: true, value: { internalId: value.internalId, tagName: value.tagName, selectorHint: value.selectorHint, id: isOptionalString(value.id) ? value.id : undefined, className: isOptionalString(value.className) ? value.className : undefined, role: isOptionalString(value.role) ? value.role : undefined, ariaLabel: isOptionalString(value.ariaLabel) ? value.ariaLabel : undefined, textSnippet: value.textSnippet, rect: rect.value, visibility: { display: value.visibility.display, visibility: value.visibility.visibility, opacity: value.visibility.opacity }, clickable: value.clickable, order: value.order } };
};
const validateDomGeometry = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("domGeometry must be object");
    const viewport = validateRuntimeViewport(value.viewport);
    if (!viewport.ok)
        return viewport;
    if (!isNonEmptyString(value.capturedAt) || !isCount(value.elementCount) || typeof value.truncated !== "boolean" || !Array.isArray(value.elements))
        return runtimeInvalid("domGeometry metadata invalid");
    const elements = [];
    for (const rawElement of value.elements) {
        const element = validateDomElementGeometry(rawElement);
        if (!element.ok)
            return element;
        elements.push(element.value);
    }
    return { ok: true, value: { viewport: viewport.value, capturedAt: value.capturedAt, elementCount: value.elementCount, truncated: value.truncated, elements } };
};
exports.validateDomGeometry = validateDomGeometry;
const validateRuntimeLayoutIssue = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("layout issue must be object");
    if (!isNonEmptyString(value.id) || !isRuntimeLayoutIssueType(value.type) || !isScanIssueSeverity(value.severity) || !isNonEmptyString(value.message) || !isNonEmptyString(value.scanTargetId) || !isLocalRoute(value.route) || !isNonEmptyString(value.elementRef))
        return runtimeInvalid("layout issue fields invalid");
    const code = value.code;
    if (code !== undefined && code !== value.type)
        return runtimeInvalid("layout issue code must equal type");
    const viewport = validateRuntimeViewport(value.viewport);
    if (!viewport.ok)
        return viewport;
    if (!isRecord(value.evidence) || !isNonEmptyString(value.evidence.threshold))
        return runtimeInvalid("layout issue evidence invalid");
    const boundingBox = validateRuntimeRect(value.evidence.boundingBox);
    if (!boundingBox.ok)
        return boundingBox;
    const evidenceViewport = validateRuntimeViewport(value.evidence.viewport);
    if (!evidenceViewport.ok)
        return evidenceViewport;
    const relatedBoundingBox = value.evidence.relatedBoundingBox === undefined ? undefined : validateRuntimeRect(value.evidence.relatedBoundingBox);
    if (relatedBoundingBox && !relatedBoundingBox.ok)
        return relatedBoundingBox;
    const overlapArea = value.evidence.overlapArea;
    const overlapRatio = value.evidence.overlapRatio;
    return { ok: true, value: { id: value.id, type: value.type, code: isRuntimeLayoutIssueType(code) ? code : undefined, severity: value.severity, message: value.message, scanTargetId: value.scanTargetId, route: value.route, viewport: viewport.value, elementRef: value.elementRef, evidence: { selectorHint: isOptionalString(value.evidence.selectorHint) ? value.evidence.selectorHint : undefined, boundingBox: boundingBox.value, relatedElementRef: isOptionalString(value.evidence.relatedElementRef) ? value.evidence.relatedElementRef : undefined, relatedSelectorHint: isOptionalString(value.evidence.relatedSelectorHint) ? value.evidence.relatedSelectorHint : undefined, relatedBoundingBox: relatedBoundingBox?.value, overlapArea: isFiniteNumber(overlapArea) ? overlapArea : undefined, overlapRatio: isFiniteNumber(overlapRatio) ? overlapRatio : undefined, viewport: evidenceViewport.value, screenshotPath: isOptionalString(value.evidence.screenshotPath) ? value.evidence.screenshotPath : undefined, threshold: value.evidence.threshold } } };
};
exports.validateRuntimeLayoutIssue = validateRuntimeLayoutIssue;
const validateRuntimeError = (value) => {
    if (!isRecord(value) || !isRuntimeErrorCode(value.code) || !isNonEmptyString(value.message))
        return runtimeInvalid("runtime error invalid");
    const viewport = value.viewport === undefined ? undefined : validateRuntimeViewport(value.viewport);
    if (viewport && !viewport.ok)
        return viewport;
    const stepIndex = value.stepIndex;
    return { ok: true, value: { code: value.code, message: value.message, targetId: isOptionalString(value.targetId) ? value.targetId : undefined, viewport: viewport?.value, stepIndex: typeof stepIndex === "number" && Number.isInteger(stepIndex) ? stepIndex : undefined } };
};
const validateRuntimeViewportResult = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime viewport result must be object");
    const viewport = validateRuntimeViewport(value.viewport);
    if (!viewport.ok)
        return viewport;
    const domGeometry = value.domGeometry === undefined ? undefined : (0, exports.validateDomGeometry)(value.domGeometry);
    if (domGeometry && !domGeometry.ok)
        return domGeometry;
    if (!Array.isArray(value.layoutIssues) || !Array.isArray(value.consoleErrors) || !Array.isArray(value.pageErrors) || !Array.isArray(value.networkErrors) || !Array.isArray(value.failedResponses) || !Array.isArray(value.errors))
        return runtimeInvalid("runtime viewport arrays invalid");
    const layoutIssues = [];
    for (const rawIssue of value.layoutIssues) {
        const issue = (0, exports.validateRuntimeLayoutIssue)(rawIssue);
        if (!issue.ok)
            return issue;
        layoutIssues.push(issue.value);
    }
    const errors = [];
    for (const rawError of value.errors) {
        const error = validateRuntimeError(rawError);
        if (!error.ok)
            return error;
        errors.push(error.value);
    }
    return { ok: true, value: { viewport: viewport.value, screenshotPath: isOptionalString(value.screenshotPath) ? value.screenshotPath : undefined, domGeometry: domGeometry?.value, layoutIssues, consoleErrors: value.consoleErrors.filter(isString), pageErrors: value.pageErrors.filter(isString), networkErrors: value.networkErrors.filter(isString), failedResponses: value.failedResponses.filter(isString), errors } };
};
const validateRuntimeTargetResult = (value) => {
    if (!isRecord(value) || !isNonEmptyString(value.scanTargetId) || (value.kind !== "route" && value.kind !== "state" && value.kind !== "flow") || !isLocalRoute(value.route) || !isScanStatus(value.status) || !Array.isArray(value.viewportResults) || !Array.isArray(value.errors))
        return runtimeInvalid("runtime target result invalid");
    const viewportResults = [];
    for (const rawViewport of value.viewportResults) {
        const viewport = validateRuntimeViewportResult(rawViewport);
        if (!viewport.ok)
            return viewport;
        viewportResults.push(viewport.value);
    }
    const errors = [];
    for (const rawError of value.errors) {
        const error = validateRuntimeError(rawError);
        if (!error.ok)
            return error;
        errors.push(error.value);
    }
    return { ok: true, value: { scanTargetId: value.scanTargetId, kind: value.kind, route: value.route, name: isOptionalString(value.name) ? value.name : undefined, status: value.status, viewportResults, executionSteps: Array.isArray(value.executionSteps) ? value.executionSteps : undefined, errors } };
};
const validateRuntimeScanResult = (value) => {
    if (!isRecord(value) || !isNonEmptyString(value.scanId) || !isScanStatus(value.status) || !isNonEmptyString(value.startedAt) || !isNonEmptyString(value.finishedAt) || !isFiniteNumber(value.durationMs))
        return runtimeInvalid("runtime scan result metadata invalid");
    const baseUrl = validateLocalRuntimeBaseUrl(value.baseUrl);
    if (!baseUrl.ok)
        return runtimeInvalid(baseUrl.message);
    if (!Array.isArray(value.targets) || !Array.isArray(value.targetResults) || !Array.isArray(value.errors) || !isRecord(value.summary))
        return runtimeInvalid("runtime scan result arrays invalid");
    const targets = [];
    for (const rawTarget of value.targets) {
        const target = validateRuntimeResultTarget(rawTarget);
        if (!target.ok)
            return target;
        targets.push(target.value);
    }
    const targetResults = [];
    for (const rawResult of value.targetResults) {
        const result = validateRuntimeTargetResult(rawResult);
        if (!result.ok)
            return result;
        targetResults.push(result.value);
    }
    const errors = [];
    for (const rawError of value.errors) {
        const error = validateRuntimeError(rawError);
        if (!error.ok)
            return error;
        errors.push(error.value);
    }
    const { targetCount, viewportCount, screenshotCount, issueCount, errorCount } = value.summary;
    if (!isCount(targetCount))
        return runtimeInvalid("runtime summary.targetCount invalid");
    if (!isCount(viewportCount))
        return runtimeInvalid("runtime summary.viewportCount invalid");
    if (!isCount(screenshotCount))
        return runtimeInvalid("runtime summary.screenshotCount invalid");
    if (!isCount(issueCount))
        return runtimeInvalid("runtime summary.issueCount invalid");
    if (!isCount(errorCount))
        return runtimeInvalid("runtime summary.errorCount invalid");
    return { ok: true, value: { scanId: value.scanId, status: value.status, startedAt: value.startedAt, finishedAt: value.finishedAt, durationMs: value.durationMs, baseUrl: baseUrl.value, targets, targetResults, summary: { targetCount, viewportCount, screenshotCount, issueCount, errorCount }, errors } };
};
exports.validateRuntimeScanResult = validateRuntimeScanResult;
const validateRuntimeArtifactMeta = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime artifact meta must be object");
    const keys = rejectUnknownKeys(value, ["scanId", "savedAt", "schemaVersion", "artifactVersion", "targetCount", "viewportCount", "screenshotCount", "issueCount", "errorCount"]);
    if (!keys.ok)
        return keys;
    if (!isNonEmptyString(value.scanId) || !isNonEmptyString(value.savedAt) || !isNonEmptyString(value.schemaVersion))
        return runtimeInvalid("runtime artifact meta strings invalid");
    const { artifactVersion, targetCount, viewportCount, screenshotCount, issueCount, errorCount } = value;
    if (!isCount(targetCount))
        return runtimeInvalid("runtime artifact meta.targetCount invalid");
    if (!isCount(viewportCount))
        return runtimeInvalid("runtime artifact meta.viewportCount invalid");
    if (!isCount(screenshotCount))
        return runtimeInvalid("runtime artifact meta.screenshotCount invalid");
    if (!isCount(issueCount))
        return runtimeInvalid("runtime artifact meta.issueCount invalid");
    if (artifactVersion !== undefined && !isCount(artifactVersion))
        return runtimeInvalid("runtime artifact meta.artifactVersion invalid");
    if (errorCount !== undefined && !isCount(errorCount))
        return runtimeInvalid("runtime artifact meta.errorCount invalid");
    return { ok: true, value: { scanId: value.scanId, savedAt: value.savedAt, schemaVersion: value.schemaVersion, artifactVersion, targetCount, viewportCount, screenshotCount, issueCount, errorCount } };
};
exports.validateRuntimeArtifactMeta = validateRuntimeArtifactMeta;
const isArtifactRefKind = (value) => value === "static-report" || value === "production-graph" || value === "runtime-scan" || value === "runtime-scan-meta" || value === "screenshot";
const isSafeArtifactRef = (value) => isNonEmptyString(value) && !value.includes("\0") && !value.includes("\\") && !value.includes("..") && !value.startsWith("/") && !/^[a-zA-Z]:/.test(value) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
const validateArtifactRef = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("artifact ref must be object");
    const keys = rejectUnknownKeys(value, ["kind", "ref", "label", "sizeBytes", "generatedAt"]);
    if (!keys.ok)
        return keys;
    if (!isArtifactRefKind(value.kind) || !isSafeArtifactRef(value.ref))
        return runtimeInvalid("artifact ref invalid");
    if (!isOptionalString(value.label) || !isOptionalString(value.generatedAt))
        return runtimeInvalid("artifact ref labels invalid");
    if (value.sizeBytes !== undefined && !isCount(value.sizeBytes))
        return runtimeInvalid("artifact ref sizeBytes invalid");
    return { ok: true, value: { kind: value.kind, ref: value.ref, label: value.label, sizeBytes: value.sizeBytes, generatedAt: value.generatedAt } };
};
exports.validateArtifactRef = validateArtifactRef;
const validateLatestStaticScanSummary = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("static scan summary must be object");
    const keys = rejectUnknownKeys(value, ["status", "issueCount", "errorCount", "warningCount", "infoCount", "sourceFileCount", "reportRef"]);
    if (!keys.ok)
        return keys;
    if (!isScanStatus(value.status) || !isCount(value.issueCount) || !isCount(value.errorCount) || !isCount(value.warningCount) || !isCount(value.infoCount) || !isCount(value.sourceFileCount))
        return runtimeInvalid("static scan summary invalid");
    const reportRef = value.reportRef === undefined ? undefined : (0, exports.validateArtifactRef)(value.reportRef);
    if (reportRef && !reportRef.ok)
        return reportRef;
    return { ok: true, value: { status: value.status, issueCount: value.issueCount, errorCount: value.errorCount, warningCount: value.warningCount, infoCount: value.infoCount, sourceFileCount: value.sourceFileCount, reportRef: reportRef?.value } };
};
const validateIssueCountRecord = (value) => isRecord(value) && Object.values(value).every(isCount);
const validateLatestRuntimeIssueSummary = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime issue summary must be object");
    const keys = rejectUnknownKeys(value, ["total", "bySeverity", "byType"]);
    if (!keys.ok)
        return keys;
    if (!isCount(value.total) || !validateIssueCountRecord(value.bySeverity) || !validateIssueCountRecord(value.byType))
        return runtimeInvalid("runtime issue summary invalid");
    const severityTotal = Object.values(value.bySeverity).reduce((sum, count) => sum + count, 0);
    const typeTotal = Object.values(value.byType).reduce((sum, count) => sum + count, 0);
    if (severityTotal !== value.total || typeTotal !== value.total)
        return runtimeInvalid("runtime issue summary total mismatch");
    return { ok: true, value: { total: value.total, bySeverity: value.bySeverity, byType: value.byType } };
};
const validateLatestRuntimeScanSummary = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("runtime scan summary must be object");
    const keys = rejectUnknownKeys(value, ["status", "targetCount", "viewportCount", "screenshotCount", "issueCount", "errorCount", "issueSummary", "artifactRef", "meta"]);
    if (!keys.ok)
        return keys;
    if (!isScanStatus(value.status) || !isCount(value.targetCount) || !isCount(value.viewportCount) || !isCount(value.screenshotCount) || !isCount(value.issueCount) || !isCount(value.errorCount))
        return runtimeInvalid("runtime scan summary invalid");
    const issueSummary = validateLatestRuntimeIssueSummary(value.issueSummary);
    if (!issueSummary.ok)
        return issueSummary;
    if (issueSummary.value.total !== value.issueCount)
        return runtimeInvalid("runtime issue count mismatch");
    const artifactRef = value.artifactRef === undefined ? undefined : (0, exports.validateArtifactRef)(value.artifactRef);
    if (artifactRef && !artifactRef.ok)
        return artifactRef;
    const meta = value.meta === undefined ? undefined : (0, exports.validateRuntimeArtifactMeta)(value.meta);
    if (meta && !meta.ok)
        return meta;
    return { ok: true, value: { status: value.status, targetCount: value.targetCount, viewportCount: value.viewportCount, screenshotCount: value.screenshotCount, issueCount: value.issueCount, errorCount: value.errorCount, issueSummary: issueSummary.value, artifactRef: artifactRef?.value, meta: meta?.value } };
};
const validateLatestProductionGraphSummary = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("production graph summary must be object");
    const keys = rejectUnknownKeys(value, ["summary", "artifactRef"]);
    if (!keys.ok)
        return keys;
    const artifactRef = value.artifactRef === undefined ? undefined : (0, exports.validateArtifactRef)(value.artifactRef);
    if (artifactRef && !artifactRef.ok)
        return artifactRef;
    if (value.summary !== undefined && !isRecord(value.summary))
        return runtimeInvalid("production graph summary invalid");
    return { ok: true, value: { summary: value.summary, artifactRef: artifactRef?.value } };
};
const validateLatestReportProjectMeta = (value) => {
    if (!isRecord(value))
        return runtimeInvalid("latest report project must be object");
    const keys = rejectUnknownKeys(value, ["name", "selectedRootRef", "selectedRootLabel"]);
    if (!keys.ok)
        return keys;
    if (!isOptionalString(value.name) || !isOptionalString(value.selectedRootLabel))
        return runtimeInvalid("latest report project labels invalid");
    if (value.selectedRootRef !== undefined && !isSafeArtifactRef(value.selectedRootRef))
        return runtimeInvalid("latest report selectedRootRef invalid");
    return { ok: true, value: { name: value.name, selectedRootRef: value.selectedRootRef, selectedRootLabel: value.selectedRootLabel } };
};
const validateLatestReportResponse = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "LatestReportResponse must be an object",
        };
    }
    const state = value.state;
    if (!isLatestReportState(state)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "state is invalid" };
    }
    if (state === "valid") {
        const keys = rejectUnknownKeys(value, ["state", "report", "generatedAt", "project", "staticScan", "productionGraph", "runtimeScanSummary", "artifactRefs", "runtimeScan", "runtimeArtifactMeta"]);
        if (!keys.ok)
            return keys;
        const report = (0, exports.validateScanResponse)(value.report);
        if (!report.ok)
            return report;
        if (value.generatedAt !== undefined && !isNonEmptyString(value.generatedAt))
            return runtimeInvalid("latest report generatedAt invalid");
        const project = value.project === undefined ? undefined : validateLatestReportProjectMeta(value.project);
        if (project && !project.ok)
            return project;
        const staticScan = value.staticScan === undefined ? undefined : validateLatestStaticScanSummary(value.staticScan);
        if (staticScan && !staticScan.ok)
            return staticScan;
        const productionGraph = value.productionGraph === undefined || value.productionGraph === null ? undefined : validateLatestProductionGraphSummary(value.productionGraph);
        if (productionGraph && !productionGraph.ok)
            return productionGraph;
        const runtimeScanSummary = value.runtimeScanSummary === undefined || value.runtimeScanSummary === null ? undefined : validateLatestRuntimeScanSummary(value.runtimeScanSummary);
        if (runtimeScanSummary && !runtimeScanSummary.ok)
            return runtimeScanSummary;
        if (value.artifactRefs !== undefined && !Array.isArray(value.artifactRefs))
            return runtimeInvalid("latest report artifactRefs invalid");
        const artifactRefs = value.artifactRefs === undefined ? undefined : [];
        if (artifactRefs)
            for (const rawRef of value.artifactRefs) {
                const ref = (0, exports.validateArtifactRef)(rawRef);
                if (!ref.ok)
                    return ref;
                artifactRefs.push(ref.value);
            }
        const runtimeScan = value.runtimeScan === undefined || value.runtimeScan === null ? undefined : (0, exports.validateRuntimeScanResult)(value.runtimeScan);
        if (runtimeScan && !runtimeScan.ok)
            return runtimeScan;
        const runtimeArtifactMeta = value.runtimeArtifactMeta === undefined || value.runtimeArtifactMeta === null ? undefined : (0, exports.validateRuntimeArtifactMeta)(value.runtimeArtifactMeta);
        if (runtimeArtifactMeta && !runtimeArtifactMeta.ok)
            return runtimeArtifactMeta;
        return {
            ok: true,
            value: {
                state: "valid",
                report: report.value,
                ...(value.generatedAt !== undefined ? { generatedAt: value.generatedAt } : {}),
                ...(project ? { project: project.value } : {}),
                ...(staticScan ? { staticScan: staticScan.value } : {}),
                ...(productionGraph ? { productionGraph: productionGraph.value } : value.productionGraph === null ? { productionGraph: null } : {}),
                ...(runtimeScanSummary ? { runtimeScanSummary: runtimeScanSummary.value } : value.runtimeScanSummary === null ? { runtimeScanSummary: null } : {}),
                ...(artifactRefs ? { artifactRefs } : {}),
                ...(runtimeScan ? { runtimeScan: runtimeScan.value } : value.runtimeScan === null ? { runtimeScan: null } : {}),
                ...(runtimeArtifactMeta ? { runtimeArtifactMeta: runtimeArtifactMeta.value } : value.runtimeArtifactMeta === null ? { runtimeArtifactMeta: null } : {}),
            },
        };
    }
    if (value.report !== null) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "report must be null when latest report is missing",
        };
    }
    const keys = rejectUnknownKeys(value, ["state", "report", "runtimeScan", "runtimeArtifactMeta"]);
    if (!keys.ok)
        return keys;
    return { ok: true, value: { state: "missing", report: null, ...(value.runtimeScan === null ? { runtimeScan: null } : {}), ...(value.runtimeArtifactMeta === null ? { runtimeArtifactMeta: null } : {}) } };
};
exports.validateLatestReportResponse = validateLatestReportResponse;
const validateScanResponse = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "ScanResponse must be an object",
        };
    }
    const scanId = value.scanId;
    const startedAt = value.startedAt;
    const finishedAt = value.finishedAt;
    const reportPath = value.reportPath;
    if (!isNonEmptyString(scanId)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "scanId must be a non-empty string",
        };
    }
    if (!isNonEmptyString(startedAt)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "startedAt must be a non-empty string",
        };
    }
    if (!isNonEmptyString(finishedAt)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "finishedAt must be a non-empty string",
        };
    }
    if (!isNonEmptyString(reportPath)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "reportPath must be a non-empty string",
        };
    }
    const status = value.status;
    if (!isScanStatus(status)) {
        return { ok: false, code: "SCHEMA_INVALID", message: "status is invalid" };
    }
    const project = validateProjectSummary(value.project);
    if (!project.ok)
        return project;
    if (typeof value.sourceFileCount !== "number") {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "sourceFileCount must be a number",
        };
    }
    const rawIssues = value.issues;
    if (!Array.isArray(rawIssues)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "issues must be an array",
        };
    }
    const issues = [];
    for (const rawIssue of rawIssues) {
        const issue = validateScanIssue(rawIssue);
        if (!issue.ok)
            return issue;
        issues.push(issue.value);
    }
    const runtimeScan = value.runtimeScan === undefined || value.runtimeScan === null ? undefined : (0, exports.validateRuntimeScanResult)(value.runtimeScan);
    if (runtimeScan && !runtimeScan.ok)
        return runtimeScan;
    return {
        ok: true,
        value: {
            scanId,
            startedAt,
            finishedAt,
            status,
            project: project.value,
            sourceFileCount: value.sourceFileCount,
            issues,
            reportPath,
            ...(runtimeScan ? { runtimeScan: runtimeScan.value } : value.runtimeScan === null ? { runtimeScan: null } : {}),
        },
    };
};
exports.validateScanResponse = validateScanResponse;
const schemaInvalid = (message) => ({
    ok: false,
    code: "SCHEMA_INVALID",
    message,
});
const isCount = (value) => typeof value === "number" && Number.isInteger(value) && value >= 0;
const validateProductionGraphLoc = (value) => {
    if (!isRecord(value))
        return schemaInvalid("loc must be an object");
    const startLine = value.startLine;
    const endLine = value.endLine;
    if (!isCount(startLine) || startLine < 1) {
        return schemaInvalid("loc.startLine must be a positive integer");
    }
    if (!isCount(endLine) || endLine < startLine) {
        return schemaInvalid("loc.endLine must be greater than or equal to startLine");
    }
    return { ok: true, value: { startLine, endLine } };
};
const validateProductionGraphRouteInfo = (value) => {
    if (!isRecord(value))
        return schemaInvalid("route must be an object");
    const routePath = value.path;
    const kind = value.kind;
    if (!isNonEmptyString(routePath)) {
        return schemaInvalid("route.path must be a non-empty string");
    }
    if (kind !== "page" && kind !== "api") {
        return schemaInvalid("route.kind must be page or api");
    }
    return { ok: true, value: { path: routePath, kind } };
};
const validateProductionGraphHttpInfo = (value) => {
    if (!isRecord(value))
        return schemaInvalid("http must be an object");
    const method = value.method;
    const httpPath = value.path;
    if (!isOptionalNonEmptyString(method)) {
        return schemaInvalid("http.method must be a non-empty string");
    }
    if (!isOptionalNonEmptyString(httpPath)) {
        return schemaInvalid("http.path must be a non-empty string");
    }
    return { ok: true, value: { method, path: httpPath } };
};
const validateProductionGraphNode = (input) => {
    if (!isRecord(input))
        return schemaInvalid("ProductionGraphNode must be an object");
    const id = input.id;
    const kind = input.kind;
    const name = input.name;
    const filePath = input.filePath;
    const confidence = input.confidence;
    const reason = input.reason;
    if (!isNonEmptyString(id))
        return schemaInvalid("node.id must be a non-empty string");
    if (!isProductionGraphNodeKind(kind))
        return schemaInvalid("node.kind is invalid");
    if (!isNonEmptyString(name))
        return schemaInvalid("node.name must be a non-empty string");
    if (!isOptionalNonEmptyString(filePath))
        return schemaInvalid("node.filePath must be a non-empty string");
    if (!isGraphConfidence(confidence))
        return schemaInvalid("node.confidence is invalid");
    if (!isNonEmptyString(reason))
        return schemaInvalid("node.reason must be a non-empty string");
    let loc;
    if (input.loc !== undefined) {
        const validation = validateProductionGraphLoc(input.loc);
        if (!validation.ok)
            return validation;
        loc = validation.value;
    }
    let route;
    if (input.route !== undefined) {
        const validation = validateProductionGraphRouteInfo(input.route);
        if (!validation.ok)
            return validation;
        route = validation.value;
    }
    let http;
    if (input.http !== undefined) {
        const validation = validateProductionGraphHttpInfo(input.http);
        if (!validation.ok)
            return validation;
        http = validation.value;
    }
    return {
        ok: true,
        value: { id, kind, name, filePath, loc, route, http, confidence, reason },
    };
};
exports.validateProductionGraphNode = validateProductionGraphNode;
const validateProductionGraphEdge = (input) => {
    if (!isRecord(input))
        return schemaInvalid("ProductionGraphEdge must be an object");
    const id = input.id;
    const kind = input.kind;
    const source = input.source;
    const target = input.target;
    const confidence = input.confidence;
    const reason = input.reason;
    if (!isNonEmptyString(id))
        return schemaInvalid("edge.id must be a non-empty string");
    if (!isProductionGraphEdgeKind(kind))
        return schemaInvalid("edge.kind is invalid");
    if (!isNonEmptyString(source))
        return schemaInvalid("edge.source must be a non-empty string");
    if (!isNonEmptyString(target))
        return schemaInvalid("edge.target must be a non-empty string");
    if (!isGraphConfidence(confidence))
        return schemaInvalid("edge.confidence is invalid");
    if (!isNonEmptyString(reason))
        return schemaInvalid("edge.reason must be a non-empty string");
    return { ok: true, value: { id, kind, source, target, confidence, reason } };
};
exports.validateProductionGraphEdge = validateProductionGraphEdge;
const validateProductionGraphSummary = (input) => {
    if (!isRecord(input))
        return schemaInvalid("ProductionGraphSummary must be an object");
    const fileCount = input.fileCount;
    const pageCount = input.pageCount;
    const componentCount = input.componentCount;
    const hookCount = input.hookCount;
    const apiRouteCount = input.apiRouteCount;
    const apiClientMethodCount = input.apiClientMethodCount;
    const externalEndpointCount = input.externalEndpointCount;
    const edgeCount = input.edgeCount;
    if (!isCount(fileCount))
        return schemaInvalid("summary.fileCount must be a non-negative integer");
    if (!isCount(pageCount))
        return schemaInvalid("summary.pageCount must be a non-negative integer");
    if (!isCount(componentCount))
        return schemaInvalid("summary.componentCount must be a non-negative integer");
    if (!isCount(hookCount))
        return schemaInvalid("summary.hookCount must be a non-negative integer");
    if (!isCount(apiRouteCount))
        return schemaInvalid("summary.apiRouteCount must be a non-negative integer");
    if (!isCount(apiClientMethodCount))
        return schemaInvalid("summary.apiClientMethodCount must be a non-negative integer");
    if (!isCount(externalEndpointCount))
        return schemaInvalid("summary.externalEndpointCount must be a non-negative integer");
    if (!isCount(edgeCount))
        return schemaInvalid("summary.edgeCount must be a non-negative integer");
    return {
        ok: true,
        value: {
            fileCount,
            pageCount,
            componentCount,
            hookCount,
            apiRouteCount,
            apiClientMethodCount,
            externalEndpointCount,
            edgeCount,
        },
    };
};
const validateProductionGraphResponse = (input) => {
    if (!isRecord(input))
        return schemaInvalid("ProductionGraphResponse must be an object");
    if (input.mode !== "symbol-level")
        return schemaInvalid("graph.mode must be symbol-level");
    if (!Array.isArray(input.nodes))
        return schemaInvalid("graph.nodes must be an array");
    if (!Array.isArray(input.edges))
        return schemaInvalid("graph.edges must be an array");
    const nodes = [];
    for (const rawNode of input.nodes) {
        const validation = (0, exports.validateProductionGraphNode)(rawNode);
        if (!validation.ok)
            return validation;
        nodes.push(validation.value);
    }
    const edges = [];
    for (const rawEdge of input.edges) {
        const validation = (0, exports.validateProductionGraphEdge)(rawEdge);
        if (!validation.ok)
            return validation;
        edges.push(validation.value);
    }
    const summaryValidation = validateProductionGraphSummary(input.summary);
    if (!summaryValidation.ok)
        return summaryValidation;
    const summary = summaryValidation.value;
    const countedSummary = {
        fileCount: nodes.filter((node) => node.kind === "file").length,
        pageCount: nodes.filter((node) => node.kind === "page").length,
        componentCount: nodes.filter((node) => node.kind === "component").length,
        hookCount: nodes.filter((node) => node.kind === "hook").length,
        apiRouteCount: nodes.filter((node) => node.kind === "api-route").length,
        apiClientMethodCount: nodes.filter((node) => node.kind === "api-client-method").length,
        externalEndpointCount: nodes.filter((node) => node.kind === "external-endpoint").length,
        edgeCount: edges.length,
    };
    for (const [key, expected] of Object.entries(countedSummary)) {
        if (summary[key] !== expected) {
            return schemaInvalid(`summary.${key} does not match graph contents`);
        }
    }
    return { ok: true, value: { mode: "symbol-level", nodes, edges, summary } };
};
exports.validateProductionGraphResponse = validateProductionGraphResponse;
