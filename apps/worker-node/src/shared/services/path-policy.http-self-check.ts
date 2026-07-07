import assert from "node:assert/strict";
import fs from "node:fs/promises";
import type http from "node:http";
import os from "node:os";
import path from "node:path";
import { createApp } from "../../app";

type JsonResponse = {
  status: number;
  body: unknown;
};

const requestJson = async (
  baseUrl: string,
  route: string,
  init?: RequestInit,
): Promise<JsonResponse> => {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
};

const assertAllowed = (result: JsonResponse, label: string): void => {
  assert.equal(result.status, 200, `${label} allowed`);
};

const assertPathDenied = (result: JsonResponse, label: string): void => {
  assert(
    result.status === 400 || result.status === 403,
    `${label} should return 400 or 403; got ${result.status} ${JSON.stringify(result.body)}`,
  );
  assert.equal(
    (result.body as { error?: { code?: string } }).error?.code,
    "PATH_NOT_ALLOWED",
    `${label} error code`,
  );
};

const listen = (app: ReturnType<typeof createApp>): Promise<{
  baseUrl: string;
  server: http.Server;
}> =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address !== "string", "server has TCP address");
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, server });
    });
  });

const createFixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-http-policy-"));
  const allowedRoot = path.join(root, "allowed");
  const outsideRoot = path.join(root, "outside");

  await fs.mkdir(path.join(allowedRoot, "src"), { recursive: true });
  await fs.mkdir(outsideRoot, { recursive: true });
  await fs.writeFile(
    path.join(allowedRoot, "package.json"),
    JSON.stringify({ name: "http-policy-fixture", dependencies: {} }),
    "utf-8",
  );
  await fs.writeFile(
    path.join(allowedRoot, "src", "index.ts"),
    "export const fixture = 1;\n",
    "utf-8",
  );

  return { allowedRoot, outsideRoot };
};

const runHttpAssertions = async (input: {
  label: string;
  allowedRoot: string;
  outsideRoot: string;
  includeScan: boolean;
}) => {
  const app = createApp();
  const { baseUrl, server } = await listen(app);

  try {
    console.log(
      JSON.stringify({
        label: input.label,
        cwd: process.cwd(),
        envLutest: process.env.LUTEST_PROJECT_PATH,
        envProject: process.env.PROJECT_PATH,
        allowedRoot: input.allowedRoot,
        outsideRoot: input.outsideRoot,
      }),
    );

    assertAllowed(await requestJson(baseUrl, "/api/project"), `${input.label} GET /api/project`);
    assertAllowed(
      await requestJson(
        baseUrl,
        `/api/project?path=${encodeURIComponent(input.allowedRoot)}`,
      ),
      `${input.label} GET /api/project allowedRoot`,
    );
    assertAllowed(
      await requestJson(
        baseUrl,
        `/api/project?path=${encodeURIComponent(path.join(input.allowedRoot, "src"))}`,
      ),
      `${input.label} GET /api/project allowedRoot child`,
    );
    assertPathDenied(
      await requestJson(
        baseUrl,
        `/api/project?path=${encodeURIComponent(input.outsideRoot)}`,
      ),
      `${input.label} GET /api/project outsideRoot`,
    );

    assertAllowed(await requestJson(baseUrl, "/api/graph"), `${input.label} GET /api/graph`);
    assertAllowed(
      await requestJson(
        baseUrl,
        `/api/graph?path=${encodeURIComponent(input.allowedRoot)}`,
      ),
      `${input.label} GET /api/graph allowedRoot`,
    );
    assertPathDenied(
      await requestJson(
        baseUrl,
        `/api/graph?path=${encodeURIComponent(input.outsideRoot)}`,
      ),
      `${input.label} GET /api/graph outsideRoot`,
    );

    assertAllowed(
      await requestJson(baseUrl, "/api/report/latest"),
      `${input.label} GET /api/report/latest`,
    );
    assertAllowed(
      await requestJson(
        baseUrl,
        `/api/report/latest?path=${encodeURIComponent(input.allowedRoot)}`,
      ),
      `${input.label} GET /api/report/latest allowedRoot`,
    );
    assertPathDenied(
      await requestJson(
        baseUrl,
        `/api/report/latest?path=${encodeURIComponent(input.outsideRoot)}`,
      ),
      `${input.label} GET /api/report/latest outsideRoot`,
    );

    if (input.includeScan) {
      assertAllowed(
        await requestJson(baseUrl, "/api/actions/scan", {
          method: "POST",
          body: JSON.stringify({ projectPath: input.allowedRoot }),
        }),
        `${input.label} POST /api/actions/scan allowedRoot`,
      );
      assertPathDenied(
        await requestJson(baseUrl, "/api/actions/scan", {
          method: "POST",
          body: JSON.stringify({ projectPath: input.outsideRoot }),
        }),
        `${input.label} POST /api/actions/scan outsideRoot`,
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

async function main(): Promise<void> {
  const oldProjectPath = process.env.LUTEST_PROJECT_PATH;
  const oldLegacyProjectPath = process.env.PROJECT_PATH;
  const oldCwd = process.cwd();

  try {
    const envFixture = await createFixture();
    process.env.LUTEST_PROJECT_PATH = envFixture.allowedRoot;
    delete process.env.PROJECT_PATH;
    await runHttpAssertions({
      label: "explicit LUTEST_PROJECT_PATH",
      allowedRoot: envFixture.allowedRoot,
      outsideRoot: envFixture.outsideRoot,
      includeScan: true,
    });

    const cwdFixture = await createFixture();
    delete process.env.LUTEST_PROJECT_PATH;
    delete process.env.PROJECT_PATH;
    process.chdir(cwdFixture.allowedRoot);
    await runHttpAssertions({
      label: "fallback cwd",
      allowedRoot: cwdFixture.allowedRoot,
      outsideRoot: cwdFixture.outsideRoot,
      includeScan: false,
    });

    console.log("path policy HTTP self-check passed");
  } finally {
    process.chdir(oldCwd);
    if (oldProjectPath === undefined) {
      delete process.env.LUTEST_PROJECT_PATH;
    } else {
      process.env.LUTEST_PROJECT_PATH = oldProjectPath;
    }
    if (oldLegacyProjectPath === undefined) {
      delete process.env.PROJECT_PATH;
    } else {
      process.env.PROJECT_PATH = oldLegacyProjectPath;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
