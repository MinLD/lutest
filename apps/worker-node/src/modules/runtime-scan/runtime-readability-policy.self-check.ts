import assert from "node:assert/strict";
import { redactRuntimeTextEvidence } from "./runtime-readability-policy";

assert.equal(redactRuntimeTextEvidence("Contact user@example.com"), "Contact [redacted-email]");
assert.equal(redactRuntimeTextEvidence("token=abcdefghijklmnopqrstuvwxyz1234567890"), "[redacted-secret]");
assert.equal(redactRuntimeTextEvidence("eyJabcdefghijk.abcdefghijkl.abcdefghijkl"), "[redacted-jwt]");
assert.equal(redactRuntimeTextEvidence("Order ORD-2026-1042 remains useful"), "Order ORD-2026-1042 remains useful");
assert.equal(redactRuntimeTextEvidence("CatalogLayoutInteractionsDiagnosticsReadabilityStaticRules"), "CatalogLayoutInteractionsDiagnosticsReadabilityStaticRules");
assert.equal(redactRuntimeTextEvidence("abcdefghijklmnopqrstuvwxyz1234567890"), "[redacted-token]");

console.log("runtime readability policy self-check passed");
