"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScanResponse = exports.validateLatestReportResponse = exports.validateLatestReportQuery = exports.validateGraphQuery = exports.validateProjectPathQuery = exports.validateScanRequest = void 0;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0;
const isOptionalNonEmptyString = (value) => value === undefined || isNonEmptyString(value);
const isErrorCode = (value) => value === "INVALID_REQUEST" ||
    value === "NOT_FOUND" ||
    value === "INTERNAL_ERROR" ||
    value === "SCHEMA_INVALID" ||
    value === "PATH_NOT_ALLOWED";
const isScanIssueType = (value) => value === "console" ||
    value === "syntax" ||
    value === "overflow" ||
    value === "todo" ||
    value === "large-file" ||
    value === "maintainability" ||
    value === "unknown";
const isScanIssueSeverity = (value) => value === "info" || value === "warning" || value === "error";
const isLatestReportState = (value) => value === "missing" ||
    value === "malformed" ||
    value === "schema-invalid" ||
    value === "valid";
const isScanStatus = (value) => value === "passed" || value === "failed" || value === "warning";
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
    const keys = rejectUnknownKeys(value, ["projectPath"]);
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
    return {
        ok: true,
        value: { projectPath },
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
    const keys = rejectUnknownKeys(value, ["path"]);
    if (!keys.ok)
        return keys;
    const projectPath = value.path;
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
    return { ok: true, value: { path: projectPath } };
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
        const report = (0, exports.validateScanResponse)(value.report);
        if (!report.ok)
            return report;
        return {
            ok: true,
            value: { state: "valid", report: report.value },
        };
    }
    if (value.report !== null) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "report must be null when state is not valid",
        };
    }
    const error = value.error;
    if (!isRecord(error)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "error must be an object when state is not valid",
        };
    }
    if (!isErrorCode(error.code)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "error.code is invalid",
        };
    }
    if (!isNonEmptyString(error.message)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "error.message must be a non-empty string",
        };
    }
    return {
        ok: true,
        value: {
            state,
            report: null,
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
            },
        },
    };
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
        },
    };
};
exports.validateScanResponse = validateScanResponse;
