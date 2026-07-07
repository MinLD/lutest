import { validateLatestReportResponse } from "./index";

const missing = validateLatestReportResponse({
  state: "missing",
  report: null,
});
if (!missing.ok || missing.value.state !== "missing") {
  throw new Error("missing latest report should validate");
}

const malformed = validateLatestReportResponse({
  state: "malformed",
  report: null,
  error: { code: "REPORT_MALFORMED", message: "bad json" },
});
if (malformed.ok) {
  throw new Error("malformed latest report must be an error response, not data");
}

const schemaInvalid = validateLatestReportResponse({
  state: "schema-invalid",
  report: null,
  error: { code: "REPORT_SCHEMA_INVALID", message: "bad schema" },
});
if (schemaInvalid.ok) {
  throw new Error("schema-invalid latest report must be an error response, not data");
}

const bad = validateLatestReportResponse({ state: "valid", report: null });
if (bad.ok) {
  throw new Error("valid latest report must include scan report");
}

console.log("latest report self-check passed");
