import { detectApiCalls } from "./api-call-detector";

const calls = detectApiCalls(`
async function load() {
  await fetch("/api/users");
  await ofetch("/api/report");
  await axios.post("/api/login", {});
  await ky.get("/api/health");
}
`);

console.assert(calls.length === 4);
console.assert(calls[0]?.target === "/api/users");
console.assert(calls[1]?.kind === "ofetch");
console.assert(calls[2]?.method === "POST");
console.assert(calls[3]?.kind === "ky");
