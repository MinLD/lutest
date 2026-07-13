import { NextResponse } from "next/server";

function cleanUrl(value: string | undefined, fallback: string): string {
  return value?.replace(/\/$/, "") || fallback;
}

export function GET() {
  return NextResponse.json({
    workerUrl: cleanUrl(process.env.LUTEST_WORKER_URL ?? process.env.NEXT_PUBLIC_LUTEST_WORKER_URL, "http://localhost:6532"),
    runtimeBaseUrl: cleanUrl(process.env.LUTEST_RUNTIME_BASE_URL ?? process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL, "http://localhost:3000"),
    projectPath: process.env.LUTEST_PROJECT_PATH ?? process.env.NEXT_PUBLIC_LUTEST_PROJECT_PATH,
  }, {
    headers: { "cache-control": "no-store" },
  });
}
