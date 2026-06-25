export type ApiCallKind = "fetch" | "axios" | "ky" | "ofetch" | "custom-client";

export type ApiCallInfo = {
  kind: ApiCallKind;
  target: string;
  method?: string;
  line: number;
};

const METHOD_CALL_PATTERN =
  /\b(?<client>axios|ky)\s*\.\s*(?<method>get|post|put|patch|delete|head|options)\s*\(\s*(?<quote>["'`])(?<target>[^"'`]+)\k<quote>/g;

const FUNCTION_CALL_PATTERN =
  /\b(?<client>fetch|ofetch)\s*\(\s*(?<quote>["'`])(?<target>[^"'`]+)\k<quote>/g;

export function detectApiCalls(source: string): ApiCallInfo[] {
  const lineStarts = getLineStarts(source);

  return [
    ...detectFunctionCalls(source, lineStarts),
    ...detectMethodCalls(source, lineStarts),
  ].sort((a, b) => a.line - b.line);
}

function detectFunctionCalls(
  source: string,
  lineStarts: number[],
): ApiCallInfo[] {
  FUNCTION_CALL_PATTERN.lastIndex = 0;
  return [...source.matchAll(FUNCTION_CALL_PATTERN)]
    .map((match) => {
      const groups = match.groups ?? {};
      const client = groups.client ?? "fetch";

      return {
        kind: (client === "ofetch" ? "ofetch" : "fetch") as ApiCallKind,
        target: groups.target ?? "",
        line: getLineNumber(lineStarts, match.index ?? 0),
      };
    })
    .filter((call) => call.target.length > 0);
}

function detectMethodCalls(
  source: string,
  lineStarts: number[],
): ApiCallInfo[] {
  METHOD_CALL_PATTERN.lastIndex = 0;
  return [...source.matchAll(METHOD_CALL_PATTERN)]
    .map((match) => {
      const groups = match.groups ?? {};
      const client = groups.client ?? "axios";

      return {
        kind: (client === "ky" ? "ky" : "axios") as ApiCallKind,
        target: groups.target ?? "",
        method: groups.method?.toUpperCase(),
        line: getLineNumber(lineStarts, match.index ?? 0),
      };
    })
    .filter((call) => call.target.length > 0);
}

function getLineStarts(source: string): number[] {
  const starts = [0];

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") starts.push(index + 1);
  }

  return starts;
}

function getLineNumber(lineStarts: number[], index: number): number {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (lineStarts[mid] <= index) low = mid + 1;
    else high = mid - 1;
  }

  return high + 1;
}

if (require.main === module) {
  const calls = detectApiCalls(`
fetch("/api/users");
ofetch("/api/report");
axios.post("/api/login", {});
ky.get("/api/health");
`);

  console.assert(calls.length === 4, "detects api calls");
  console.assert(calls[0]?.kind === "fetch", "fetch kind");
  console.assert(calls[1]?.kind === "ofetch", "ofetch kind");
  console.assert(calls[2]?.kind === "axios", "axios kind");
  console.assert(calls[2]?.method === "POST", "axios method");
  console.assert(calls[3]?.kind === "ky", "ky kind");
}
