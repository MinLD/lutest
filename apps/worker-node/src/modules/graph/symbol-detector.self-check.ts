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

function hasComponent(name: string) {
  return result.components.some((symbol) => symbol.name === name);
}

function hasApi(name: string, target?: string) {
  return result.apis.some(
    (symbol) =>
      symbol.name === name && (target === undefined || symbol.target === target),
  );
}

if (result.pages.length !== 1) {
  throw new Error(`expected 1 page symbol, got ${result.pages.length}`);
}

if (!hasComponent("Page")) {
  throw new Error("default page component symbol missing");
}

if (!hasComponent("Dashboard")) {
  throw new Error("function component symbol missing");
}

if (!hasComponent("InlineCard")) {
  throw new Error("arrow component symbol missing");
}

if (!hasComponent("LegacyWidget")) {
  throw new Error("class component symbol missing");
}

if (hasComponent("NotAComponent")) {
  throw new Error("non-function const should not be component");
}

if (!hasApi("fetch", "/api/project")) {
  throw new Error("fetch API symbol missing");
}

if (!hasApi("client.get", "/api/client")) {
  throw new Error("custom client API symbol missing");
}