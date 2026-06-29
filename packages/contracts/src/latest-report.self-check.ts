import { validateLatestReportResponse } from "./index";

const missing = validateLatestReportResponse({
  state: "missing",
  report: null,
  error: { code: "NOT_FOUND", message: "missing report" },
});
if (!missing.ok || missing.value.state !== "missing") {
  throw new Error("missing latest report should validate");
}

const malformed = validateLatestReportResponse({
  state: "malformed",
  report: null,
  error: { code: "SCHEMA_INVALID", message: "bad json" },
});
if (!malformed.ok || malformed.value.state !== "malformed") {
  throw new Error("malformed latest report should validate");
}

const schemaInvalid = validateLatestReportResponse({
  state: "schema-invalid",
  report: null,
  error: { code: "SCHEMA_INVALID", message: "bad schema" },
});
if (!schemaInvalid.ok || schemaInvalid.value.state !== "schema-invalid") {
  throw new Error("schema-invalid latest report should validate");
}

const bad = validateLatestReportResponse({ state: "valid", report: null });
if (bad.ok) {
  throw new Error("valid latest report must include scan report");
}