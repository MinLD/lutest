import { validateProjectPathQuery, validateScanRequest } from "./index";

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

same(validateProjectPathQuery(undefined), {
  ok: true,
  value: undefined,
}, "missing path query valid");

same(validateProjectPathQuery("D:\\Projects\\lutest"), {
  ok: true,
  value: "D:\\Projects\\lutest",
}, "path query valid");

assert(!validateProjectPathQuery("").ok, "empty path query invalid");
assert(!validateProjectPathQuery(["a", "b"]).ok, "array path query invalid");

console.log("validators self-check passed");