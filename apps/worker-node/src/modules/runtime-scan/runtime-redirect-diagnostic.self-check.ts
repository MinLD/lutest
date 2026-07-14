import assert from "node:assert/strict";
import { isSameTargetUrl, runtimeRedirectDiagnostic } from "./playwright-scan.service";

const baseUrl = new URL("http://127.0.0.1:3000");

assert.equal(runtimeRedirectDiagnostic({ requestedRoute: "/dashboard", finalUrl: "http://127.0.0.1:3000/dashboard", baseUrl }), null);
assert.equal(runtimeRedirectDiagnostic({ requestedRoute: "/dashboard/", finalUrl: "http://127.0.0.1:3000/dashboard?tab=1", baseUrl }), null);

const diagnostic = runtimeRedirectDiagnostic({ requestedRoute: "/dashboard", finalUrl: "http://127.0.0.1:3000/login", baseUrl });
assert(diagnostic);
assert.equal(diagnostic.type, "warning");
assert.match(diagnostic.text, /login\/auth is required/i);
assert.doesNotMatch(diagnostic.text, /cookie|token|password|storageState/i);

assert.equal(runtimeRedirectDiagnostic({ requestedRoute: "/dashboard", finalUrl: "https://example.com/login", baseUrl }), null);
assert.equal(isSameTargetUrl("http://127.0.0.1:3000/admin?x=1", "http://127.0.0.1:3000/admin"), true);
assert.equal(isSameTargetUrl("http://127.0.0.1:3000/login?next=/admin", "http://127.0.0.1:3000/admin"), false);
assert.equal(isSameTargetUrl("http://localhost:3000/admin", "http://127.0.0.1:3000/admin"), false);

console.log("runtime redirect diagnostic self-check passed");
