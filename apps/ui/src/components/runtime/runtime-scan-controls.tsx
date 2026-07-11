"use client";

import { useMemo, useState } from "react";
import type { RuntimeScanRequest } from "@lutest/contracts";
import {
  buildRuntimeScanSelectionRequest,
  submitRuntimeScanSelection,
  type RuntimeScanRouteOption,
} from "@/lib/runtime-scan-selection";

const DEFAULT_RUNTIME_BASE_URL =
  process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL ?? "http://localhost:3000";

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
  const [mode, setMode] = useState<"all-routes" | "selected-routes">("selected-routes");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_RUNTIME_BASE_URL);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [interactionDiscoveryEnabled, setInteractionDiscoveryEnabled] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const availableRoutes = useMemo(() => routes.map((option) => option.route), [routes]);
  const validation = useMemo(() => buildRuntimeScanSelectionRequest({
    mode,
    baseUrl,
    availableRoutes,
    selectedRoutes,
    interactionDiscoveryEnabled,
  }), [availableRoutes, baseUrl, interactionDiscoveryEnabled, mode, selectedRoutes]);

  const toggleRoute = (route: string): void => {
    setSelectedRoutes((current) => current.includes(route)
      ? current.filter((candidate) => candidate !== route)
      : [...current, route]);
    setSubmitError(undefined);
  };

  const runRuntime = async (): Promise<void> => {
    setSubmitError(undefined);
    const result = await submitRuntimeScanSelection({
      mode,
      baseUrl,
      availableRoutes,
      selectedRoutes,
      interactionDiscoveryEnabled,
    }, onRunRuntimeScan);
    if (!result.ok) setSubmitError(result.message);
  };

  return (
    <section className="rounded-2xl border border-[#dbe7f5] bg-[#fbfdff] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Runtime scan targets</p>
          <p className="mt-1 text-sm text-[#667085]">Choose routes explicitly. Opening or refreshing this page never starts a scan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRunStaticScan} disabled={isScanning} className="rounded-xl border border-[#cbd9eb] bg-white px-3.5 py-2 text-sm font-semibold text-[#344054] transition hover:border-[#94aaca] disabled:cursor-not-allowed disabled:opacity-60">
            Run static scan
          </button>
          <button type="button" onClick={() => void runRuntime()} disabled={isScanning || !validation.ok} className="rounded-xl bg-[#2563eb] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">
            {isScanning ? "Scanning..." : "Run runtime scan"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Runtime route mode">
            <button type="button" role="radio" aria-checked={mode === "selected-routes"} onClick={() => { setMode("selected-routes"); setSubmitError(undefined); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "selected-routes" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-white text-[#667085]"}`}>
              Scan selected
            </button>
            <button type="button" role="radio" aria-checked={mode === "all-routes"} onClick={() => { setMode("all-routes"); setSubmitError(undefined); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "all-routes" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-white text-[#667085]"}`}>
              Scan all routes
            </button>
          </div>

          {routes.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#cbd9eb] bg-white p-4 text-sm text-[#667085]">No valid page routes were found in the production graph or latest runtime detail.</p>
          ) : mode === "selected-routes" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {routes.map((option) => (
                <label key={option.route} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#e5edf7] bg-white px-3 py-2.5 text-sm text-[#344054]">
                  <input type="checkbox" checked={selectedRoutes.includes(option.route)} onChange={() => toggleRoute(option.route)} className="size-4 accent-[#2563eb]" />
                  <span className="min-w-0 flex-1 truncate font-mono">{option.route}</span>
                  <span className="text-[11px] text-[#98a2b3]">{option.source === "production-graph" ? "graph" : "latest"}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm text-[#475467]">All {routes.length} discovered routes will be scanned.</p>
          )}
        </div>

        <div className="grid content-start gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            Local base URL
            <input type="url" value={baseUrl} onChange={(event) => { setBaseUrl(event.target.value); setSubmitError(undefined); }} spellCheck={false} className="rounded-xl border border-[#cbd9eb] bg-white px-3 py-2 font-mono text-sm font-normal text-[#111827] outline-none focus:border-[#2563eb]" />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#cbd9eb] bg-white px-3 py-3 text-sm text-[#344054]">
            <input
              type="checkbox"
              checked={interactionDiscoveryEnabled}
              onChange={(event) => { setInteractionDiscoveryEnabled(event.target.checked); setSubmitError(undefined); }}
              className="mt-0.5 size-4 accent-[#2563eb]"
            />
            <span>
              <span className="block font-semibold">Discover safe UI states</span>
              <span className="mt-0.5 block text-xs font-normal leading-5 text-[#667085]">Clicks safe tabs, menus and disclosures only. No forms, navigation or destructive actions.</span>
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            Viewport preset
            <select value="default" disabled className="rounded-xl border border-[#cbd9eb] bg-white px-3 py-2 text-sm font-normal text-[#475467] disabled:opacity-100">
              <option value="default">Default matrix</option>
            </select>
          </label>
          {!validation.ok || submitError ? <p role="alert" className="text-sm font-medium text-[#b42318]">{submitError ?? (!validation.ok ? validation.message : undefined)}</p> : null}
        </div>
      </div>
    </section>
  );
}
