import assert from "node:assert/strict";
import { createServer } from "node:http";
import { getManagedAppPort, resolveRuntimeBaseUrlDecision } from "./main";

const emptyEnv: NodeJS.ProcessEnv = {};
const server = createServer((_request, response) => {
  response.end("other app");
});

function listenOnDefaultPortIfFree(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    });
    server.listen(3000, "127.0.0.1", () => resolve(true));
  });
}

function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function main(): Promise<void> {
  assert.deepEqual(resolveRuntimeBaseUrlDecision({ baseUrl: "http://127.0.0.1:5173/", startApp: true }, emptyEnv), {
    type: "explicit",
    baseUrl: "http://127.0.0.1:5173",
  });

  assert.throws(
    () => resolveRuntimeBaseUrlDecision({ startApp: false }, emptyEnv),
    /No runtime baseUrl provided/,
  );

  const serverStarted = await listenOnDefaultPortIfFree();
  try {
    assert.deepEqual(resolveRuntimeBaseUrlDecision({ startApp: true }, emptyEnv), { type: "managed" });
    if (serverStarted) assert.notEqual(await getManagedAppPort(3000), 3000, "managed app skips occupied HTTP port");
  } finally {
    if (serverStarted) await closeServer();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
