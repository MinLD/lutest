import { strict as assert } from "node:assert";
import { normalizeChromiumStatus } from "./lutest-runtime-config";

assert.equal(normalizeChromiumStatus("ok"), "ok");
assert.equal(normalizeChromiumStatus("missing"), "missing");
assert.equal(normalizeChromiumStatus("broken"), "unknown");
assert.equal(normalizeChromiumStatus(undefined), "unknown");

console.log("lutest runtime config self-check passed");
