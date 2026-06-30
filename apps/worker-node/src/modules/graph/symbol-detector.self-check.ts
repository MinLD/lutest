import { strict as assert } from "node:assert";
import { detectSymbols } from "./symbol-detector";

const source = `
export default function Page() {
  return <Dashboard />;
}

function Dashboard() {
  const data = useProject();
  return <div>{data.name}</div>;
}

const InlineCard = () => <section />;

const NotAComponent = "text";

function useProject() {
  return fetch("/api/project");
}

function loadViaClient(client: { get(path: string): Promise<unknown> }) {
  return client.get("/api/client");
}

class LegacyWidget {}
`;

const result = detectSymbols("app/dashboard/page.tsx", source);

const hasDeclaration = (name: string) =>
  result.declarations.some((symbol) => symbol.name === name);

const hasApi = (callee: string, target: string, method?: string) =>
  result.apis.some(
    (symbol) =>
      symbol.callee === callee &&
      symbol.target === target &&
      symbol.method === method,
  );

assert.equal(result.declarations.length, 4);
assert.equal(result.apis.length, 2);

assert.ok(hasDeclaration("Page"));
assert.ok(hasDeclaration("Dashboard"));
assert.ok(hasDeclaration("InlineCard"));
assert.ok(hasDeclaration("LegacyWidget"));
assert.equal(hasDeclaration("NotAComponent"), false);

assert.ok(hasApi("fetch", "/api/project"));
assert.ok(hasApi("client.get", "/api/client", "GET"));
assert.equal(result.apis[0]?.line, 16);
assert.equal(result.apis[0]?.column, 10);