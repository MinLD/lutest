import {
  validateGraphQuery,
  validateLatestReportQuery,
  validateProjectPathQuery,
  validateScanRequest,
} from "./index";

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const same = (actual: unknown, expected: unknown, message: string): void => {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
};

same(validateScanRequest({}), {
  ok: true,
  value: { projectPath: undefined },
}, "empty scan request valid");

same(validateScanRequest({ projectPath: "D:\\Projects\\lutest" }), {
  ok: true,
  value: { projectPath: "D:\\Projects\\lutest" },
}, "scan request projectPath valid");

assert(!validateScanRequest(null).ok, "null scan request invalid");
assert(!validateScanRequest({ projectPath: "" }).ok, "empty projectPath invalid");
assert(!validateScanRequest({ projectPath: 123 }).ok, "number projectPath invalid");
assert(
  !validateScanRequest({ projectPath: "x", extra: true }).ok,
  "unknown scan field invalid",
);

same(validateProjectPathQuery({}), {
  ok: true,
  value: { path: undefined },
}, "missing path query valid");

same(validateProjectPathQuery({ path: "D:\\Projects\\lutest" }), {
  ok: true,
  value: { path: "D:\\Projects\\lutest" },
}, "path query valid");

assert(!validateProjectPathQuery({ path: "" }).ok, "empty path query invalid");
assert(
  !validateProjectPathQuery({ path: ["a", "b"] }).ok,
  "array path query invalid",
);
assert(!validateProjectPathQuery({ extra: true }).ok, "unknown query invalid");
same(validateGraphQuery({}), {
  ok: true,
  value: { path: undefined },
}, "graph query valid");
same(validateLatestReportQuery({}), {
  ok: true,
  value: { path: undefined },
}, "latest report query valid");

console.log("validators self-check passed");
