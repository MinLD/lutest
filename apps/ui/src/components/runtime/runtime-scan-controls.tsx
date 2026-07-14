"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthStatusResponse, RuntimeScanRequest } from "@lutest/contracts";
import {
  buildRuntimeScanSelectionRequest,
  submitRuntimeScanSelection,
  type RuntimeScanRouteOption,
} from "@/lib/runtime-scan-selection";
import { lutestApi } from "@/lib/api-client";
import {
  getInitialRuntimeConfig,
  getRuntimeConfig,
} from "@/lib/lutest-runtime-config";

const INITIAL_RUNTIME_CONFIG = getInitialRuntimeConfig();
const INSTALL_BROWSER_COMMAND = "lutest install-browsers";

export function RuntimeScanControls({
  routes,
  isScanning,
  onRunStaticScan,
  onRunRuntimeScan,
}: {
  routes: RuntimeScanRouteOption[];
  isScanning: boolean;
  onRunStaticScan: () => Promise<void> | void;
  onRunRuntimeScan: (request: RuntimeScanRequest) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"all-routes" | "selected-routes">(
    "all-routes",
  );
  const [baseUrl, setBaseUrl] = useState(INITIAL_RUNTIME_CONFIG.runtimeBaseUrl);
  const [chromiumStatus, setChromiumStatus] = useState(
    INITIAL_RUNTIME_CONFIG.chromiumStatus,
  );
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [interactionDiscoveryEnabled, setInteractionDiscoveryEnabled] =
    useState(false);
  const [useSavedAuthState, setUseSavedAuthState] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse>({
    status: "missing",
    exists: false,
    valid: false,
  });
  const [submitError, setSubmitError] = useState<string>();
  const browserMissing = chromiumStatus === "missing";
  const authReady = authStatus.status === "valid" && authStatus.valid;
  const availableRoutes = useMemo(
    () => routes.map((option) => option.route),
    [routes],
  );
  const validation = useMemo(
    () =>
      buildRuntimeScanSelectionRequest({
        mode,
        baseUrl,
        availableRoutes,
        selectedRoutes,
        interactionDiscoveryEnabled,
        useSavedAuthState,
      }),
    [
      availableRoutes,
      baseUrl,
      interactionDiscoveryEnabled,
      mode,
      selectedRoutes,
      useSavedAuthState,
    ],
  );

  const loadAuthStatus = async (): Promise<void> => {
    try {
      const status = await lutestApi.getAuthStatus();
      setAuthStatus(status);
      if (status.status !== "valid") setUseSavedAuthState(false);
    } catch (cause) {
      setUseSavedAuthState(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void getRuntimeConfig().then((config) => {
      if (!cancelled) {
        setBaseUrl(config.runtimeBaseUrl);
        setChromiumStatus(config.chromiumStatus);
      }
    });
    void loadAuthStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRoute = (route: string): void => {
    setSelectedRoutes((current) =>
      current.includes(route)
        ? current.filter((candidate) => candidate !== route)
        : [...current, route],
    );
    setSubmitError(undefined);
  };

  const runRuntime = async (): Promise<void> => {
    setSubmitError(undefined);
    const result = await submitRuntimeScanSelection(
      {
        mode,
        baseUrl,
        availableRoutes,
        selectedRoutes,
        interactionDiscoveryEnabled,
        useSavedAuthState,
      },
      onRunRuntimeScan,
    );
    if (!result.ok) setSubmitError(result.message);
  };

  return (
    <section className="rounded-2xl border border-[#dbe7f5] bg-[#fbfdff] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">
            Runtime scan targets
          </p>
          <p className="mt-1 text-sm text-[#667085]">
            Run normally. If a route redirects to login, Lutest opens a browser
            so you can sign in, then retries that route.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRunStaticScan}
            disabled={isScanning}
            className="rounded-xl border border-[#cbd9eb] bg-white px-3.5 py-2 text-sm font-semibold text-[#344054] transition hover:border-[#94aaca] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run static scan
          </button>
          <button
            type="button"
            onClick={() => void runRuntime()}
            disabled={isScanning || !validation.ok || browserMissing}
            className="rounded-xl bg-[#2563eb] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isScanning ? "Scanning..." : "Run runtime scan"}
          </button>
        </div>
      </div>

      {browserMissing ? (
        <div
          className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <p className="font-semibold">
            Chromium is not installed, so runtime scans are paused.
          </p>
          <p className="mt-1 text-amber-800">
            Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              {INSTALL_BROWSER_COMMAND}
            </code>
            , then restart{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              lutest
            </code>
            .
          </p>
        </div>
      ) : null}

      {isScanning ? <ScanProgressSkeleton /> : null}

      <div className="mt-4 rounded-2xl border border-[#dbe7f5] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              Login during scan
            </p>
            <p className="mt-1 text-sm text-[#667085]">
              No route or selector setup needed. Wrong-role login stays on the
              login page; Lutest keeps waiting until the protected target opens
              or the scan times out.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${authReady ? "bg-[#dcfce7] text-[#166534]" : authStatus.status === "invalid" ? "bg-[#fee2e2] text-[#991b1b]" : "bg-[#f2f4f7] text-[#667085]"}`}
          >
            {authStatus.status}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-[#475467]">
          <p>
            {authReady
              ? "Saved auth state is available if you want to reuse the last successful login."
              : "If login is required, Lutest will prompt during the scan."}
          </p>
          {authStatus.savedAt ? (
            <p>
              Saved{" "}
              <time dateTime={authStatus.savedAt}>{authStatus.savedAt}</time>
            </p>
          ) : null}
          {authStatus.error ? (
            <p role="alert" className="font-medium text-[#b42318]">
              {authStatus.error.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Runtime route mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "selected-routes"}
              onClick={() => {
                setMode("selected-routes");
                setSubmitError(undefined);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "selected-routes" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-white text-[#667085]"}`}
            >
              Scan selected
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "all-routes"}
              onClick={() => {
                setMode("all-routes");
                setSubmitError(undefined);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "all-routes" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-white text-[#667085]"}`}
            >
              Scan all routes
            </button>
          </div>

          {routes.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#cbd9eb] bg-white p-4 text-sm text-[#667085]">
              No valid page routes were found in the production graph or latest
              runtime detail.
            </p>
          ) : mode === "selected-routes" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {routes.map((option) => (
                <label
                  key={option.route}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#e5edf7] bg-white px-3 py-2.5 text-sm text-[#344054]"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoutes.includes(option.route)}
                    onChange={() => toggleRoute(option.route)}
                    className="size-4 accent-[#2563eb]"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {option.route}
                  </span>
                  <span className="text-[11px] text-[#98a2b3]">
                    {option.source === "production-graph" ? "graph" : "latest"}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm text-[#475467]">
              All {routes.length} discovered routes will be scanned.
            </p>
          )}
        </div>

        <div className="grid content-start gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            Local base URL
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setSubmitError(undefined);
              }}
              spellCheck={false}
              disabled
              className=" rounded-xl border border-[#cbd9eb] bg-white px-3 py-2 font-mono text-sm font-normal text-[#111827] outline-none focus:border-[#2563eb]"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#cbd9eb] bg-white px-3 py-3 text-sm text-[#344054]">
            <input
              type="checkbox"
              checked={interactionDiscoveryEnabled}
              onChange={(event) => {
                setInteractionDiscoveryEnabled(event.target.checked);
                setSubmitError(undefined);
              }}
              className="mt-0.5 size-4 accent-[#2563eb]"
            />
            <span>
              <span className="block font-semibold">
                Discover safe UI states
              </span>
              <span className="mt-0.5 block text-xs font-normal leading-5 text-[#667085]">
                Clicks safe tabs, menus and disclosures only. No forms,
                navigation or destructive actions.
              </span>
            </span>
          </label>
          <label
            className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm ${authReady ? "cursor-pointer border-[#cbd9eb] bg-white text-[#344054]" : "cursor-not-allowed border-[#e5e7eb] bg-[#f9fafb] text-[#98a2b3]"}`}
          >
            <input
              type="checkbox"
              checked={useSavedAuthState}
              disabled={!authReady}
              onChange={(event) => {
                setUseSavedAuthState(event.target.checked);
                setSubmitError(undefined);
              }}
              className="mt-0.5 size-4 accent-[#2563eb] disabled:opacity-40"
            />
            <span>
              <span className="block font-semibold">Use saved auth state</span>
              <span className="mt-0.5 block text-xs font-normal leading-5 text-[#667085]">
                Opt-in only. Raw cookies, tokens and storageState stay on disk.
              </span>
            </span>
          </label>

          {!validation.ok || submitError ? (
            <p role="alert" className="text-sm font-medium text-[#b42318]">
              {submitError ?? (!validation.ok ? validation.message : undefined)}
            </p>
            
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ScanProgressSkeleton() {
  const steps = [
    "Preparing local scan",
    "Reading project graph",
    "Capturing runtime evidence",
  ];
  return (
    <div
      className="mt-4 rounded-2xl border border-[#cfe0f5] bg-white p-4 shadow-[0_12px_30px_rgba(37,99,235,0.08)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Scan running</p>
          <p className="mt-1 text-xs text-[#667085]">
            Keep this page open while Lutest refreshes reports.
          </p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-[#e8f1ff]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#2563eb]" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step}
            className="rounded-xl border border-[#e5edf7] bg-[#fbfdff] p-3"
          >
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#dbeafe]" />
            <p className="mt-3 text-xs font-semibold text-[#405168]">{step}</p>
            <div className="mt-3 grid gap-1.5">
              <div className="h-2 animate-pulse rounded-full bg-[#eef4fb]" />
              <div className="h-2 w-2/3 animate-pulse rounded-full bg-[#eef4fb]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
