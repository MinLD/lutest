import { NextResponse } from "next/server";
import { normalizeChromiumStatus } from "@/lib/lutest-runtime-config";

function cleanUrl(value: string | undefined, fallback: string): string {
  return value?.replace(/\/$/, "") || fallback;
}

export function GET() {
  return NextResponse.json({
    workerUrl: cleanUrl(process.env.LUTEST_WORKER_URL ?? process.env.NEXT_PUBLIC_LUTEST_WORKER_URL, "http://localhost:6532"),
    runtimeBaseUrl: cleanUrl(process.env.LUTEST_RUNTIME_BASE_URL ?? process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL, "http://localhost:3000"),
    projectPath: process.env.LUTEST_PROJECT_PATH ?? process.env.NEXT_PUBLIC_LUTEST_PROJECT_PATH,
    chromiumStatus: normalizeChromiumStatus(process.env.LUTEST_CHROMIUM_STATUS ?? process.env.NEXT_PUBLIC_LUTEST_CHROMIUM_STATUS),
  }, {
    headers: { "cache-control": "no-store" },
  });
}
