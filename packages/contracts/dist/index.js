"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScanResponse = exports.validateProjectPathQuery = exports.validateScanRequest = void 0;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0;
const validateScanRequest = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "Request body must be an object",
        };
    }
    if (value.projectPath !== undefined && !isNonEmptyString(value.projectPath)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "projectPath must be a non-empty string",
        };
    }
    return {
        ok: true,
        value: { projectPath: value.projectPath },
    };
};
exports.validateScanRequest = validateScanRequest;
const validateProjectPathQuery = (value) => {
    if (value === undefined)
        return { ok: true, value: undefined };
    if (Array.isArray(value)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "path query must be a single string",
        };
    }
    if (!isNonEmptyString(value)) {
        return {
            ok: false,
            code: "INVALID_REQUEST",
            message: "path query must be a non-empty string",
        };
    }
    return { ok: true, value };
};
exports.validateProjectPathQuery = validateProjectPathQuery;
const validateScanResponse = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "ScanResponse must be an object",
        };
    }
    const requiredStrings = ["scanId", "startedAt", "finishedAt", "reportPath"];
    for (const key of requiredStrings) {
        if (!isNonEmptyString(value[key])) {
            return {
                ok: false,
                code: "SCHEMA_INVALID",
                message: `${key} must be a non-empty string`,
            };
        }
    }
    if (!["passed", "failed", "warning"].includes(String(value.status))) {
        return { ok: false, code: "SCHEMA_INVALID", message: "status is invalid" };
    }
    if (!isRecord(value.project)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "project must be an object",
        };
    }
    if (typeof value.sourceFileCount !== "number") {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "sourceFileCount must be a number",
        };
    }
    if (!Array.isArray(value.issues)) {
        return {
            ok: false,
            code: "SCHEMA_INVALID",
            message: "issues must be an array",
        };
    }
    return { ok: true, value: value };
};
exports.validateScanResponse = validateScanResponse;
