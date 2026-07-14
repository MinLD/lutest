"use client";

import { useState } from "react";
import { runtimeScreenshotUrl } from "@/lib/api-client";
import {
  runtimeOverlayEdgeMarker,
  runtimeOverlayCalloutPlacement,
  runtimeOverlayPointMarker,
  runtimeOverlayRect,
  runtimeIssueGuidance,
  runtimeScreenshotProjection,
  runtimeScreenshotMissingLabel,
  type RuntimeImageSize,
  type RuntimeOverlayRect,
} from "@/lib/runtime-screenshot-overlay";
import type { RuntimeIssueView } from "@/lib/runtime-report-view-model";

function OverlayBox({ rect, related = false }: { rect: RuntimeOverlayRect; related?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 border-2 ${related ? "border-[#f59e0b] bg-[#f59e0b]/15" : "border-[#ef4444] bg-[#ef4444]/15"}`}
      style={{
        left: `${rect.leftPercent}%`,
        top: `${rect.topPercent}%`,
        width: `${rect.widthPercent}%`,
        height: `${rect.heightPercent}%`,
      }}
    />
  );
}

const edgeMarkerPosition = (side: "left" | "right" | "top" | "bottom", positionPercent: number) => {
  if (side === "left") return { left: "0.25rem", top: `${positionPercent}%`, transform: "translateY(-50%)" };
  if (side === "right") return { right: "0.25rem", top: `${positionPercent}%`, transform: "translateY(-50%)" };
  if (side === "top") return { left: `${positionPercent}%`, top: "0.25rem", transform: "translateX(-50%)" };
  return { bottom: "0.25rem", left: `${positionPercent}%`, transform: "translateX(-50%)" };
};

export function RuntimeScreenshotEvidence({ issue }: { issue: RuntimeIssueView }) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");
  const [naturalSize, setNaturalSize] = useState<RuntimeImageSize>();
  const screenshotUrl = runtimeScreenshotUrl(issue.screenshotRef);
  const projection = naturalSize ? runtimeScreenshotProjection(issue.boundingBox, issue.viewport, naturalSize) : undefined;
  const focusTop = projection?.focusTop ?? 0;
  const primaryRect = naturalSize ? runtimeOverlayRect(issue.boundingBox, issue.viewport, naturalSize, focusTop) : undefined;
  const relatedRect = naturalSize ? runtimeOverlayRect(issue.relatedBoundingBox, issue.viewport, naturalSize, focusTop) : undefined;
  const edgeMarker = naturalSize && !primaryRect ? runtimeOverlayEdgeMarker(issue.boundingBox, issue.viewport, naturalSize, focusTop) : undefined;
  const pointMarker = naturalSize && !primaryRect && !edgeMarker ? runtimeOverlayPointMarker(issue.boundingBox, issue.viewport, naturalSize, focusTop) : undefined;
  const guidance = runtimeIssueGuidance(issue.type, issue.boundingBox, issue.viewport, issue.overlapRatio);
  const calloutTarget = primaryRect ?? pointMarker;
  const calloutPlacement = calloutTarget ? runtimeOverlayCalloutPlacement(calloutTarget) : undefined;

  if (!issue.screenshotAvailable || !screenshotUrl) {
    const message = issue.screenshotAvailable
      ? "Screenshot reference is invalid or unavailable."
      : runtimeScreenshotMissingLabel(issue.screenshotMissingReason);
    return (
      <div className="rounded-2xl border border-dashed border-[#cbd9eb] bg-[#fbfdff] p-4 text-sm text-[#667085]">
        <p className="font-semibold text-[#344054]">Screenshot evidence unavailable</p>
        <p className="mt-1">{message}</p>
      </div>
    );
  }

  return (
    <figure className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold text-[#111827]">Selected issue screenshot</p>
          <p className="mt-1 text-[#667085]">{issue.route} · {issue.viewport.width} × {issue.viewport.height} · {issue.selectorHint ?? issue.elementRef}</p>
        </div>
        <p className="max-w-xl text-[#667085]">{issue.threshold}</p>
      </figcaption>
      <div className="relative flex min-h-48 items-start justify-center overflow-hidden rounded-xl border border-[#dbe7f5] bg-[#eef3f9] p-2">
        <div
          className="relative max-w-full overflow-hidden rounded-lg bg-white"
          style={{ width: `min(100%, ${issue.viewport.width}px)`, aspectRatio: `${issue.viewport.width} / ${issue.viewport.height}` }}
        >
          <img
            src={screenshotUrl}
            alt={`Runtime evidence for ${issue.type} on ${issue.route}`}
            className={`absolute left-0 top-0 block h-auto max-w-none ${imageState === "error" ? "invisible" : ""}`}
            style={{
              width: `${projection?.imageWidthPercent ?? 100}%`,
              transform: `translateY(-${projection?.imageTranslateYPercent ?? 0}%)`,
              transformOrigin: "top left",
            }}
            onLoad={(event) => {
              setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
              setImageState("loaded");
            }}
            onError={() => setImageState("error")}
          />
          {imageState === "loaded" && primaryRect ? <OverlayBox rect={primaryRect} /> : null}
          {imageState === "loaded" && relatedRect ? <OverlayBox rect={relatedRect} related /> : null}
          {imageState === "loaded" && pointMarker ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#dc2626] shadow-[0_0_0_3px_#dc2626]"
              style={{ left: `${pointMarker.xPercent}%`, top: `${pointMarker.yPercent}%` }}
            />
          ) : null}
          {imageState === "loaded" && edgeMarker ? (
            <span className="pointer-events-none absolute z-30 max-w-44 rounded-md bg-[#dc2626] px-2.5 py-1.5 text-[10px] font-bold leading-4 text-white shadow-lg" style={edgeMarkerPosition(edgeMarker.side, edgeMarker.positionPercent)}>
              Element is {Math.round(edgeMarker.distancePx)}px beyond the {edgeMarker.side} edge
            </span>
          ) : null}
          {imageState === "loaded" && !edgeMarker && calloutPlacement ? (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="runtime-evidence-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L9,4.5 L0,9 Z" fill="#dc2626" />
                </marker>
              </defs>
              <line
                x1={calloutPlacement?.connectorStartX}
                y1={calloutPlacement?.connectorStartY}
                x2={calloutPlacement.targetX}
                y2={calloutPlacement.targetY}
                stroke="#dc2626"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#runtime-evidence-arrow)"
              />
            </svg>
          ) : null}
          {imageState === "loaded" && !edgeMarker && calloutPlacement ? (
            <div
              className="pointer-events-none absolute z-30 w-56 max-w-[calc(100%_-_1rem)] rounded-xl border border-[#fecaca] bg-white/95 px-3 py-2.5 text-left shadow-lg backdrop-blur"
              style={{
                left: `clamp(0.5rem, calc(${calloutPlacement.targetX}% - 7rem), calc(100% - 14.5rem))`,
                top: `${calloutPlacement.targetY}%`,
                transform: `translateY(${calloutPlacement.vertical === "below" ? "1.25rem" : "calc(-100% - 1.25rem)"})`,
              }}
            >
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-[#dc2626]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-4 text-[#991b1b]">{guidance.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#b42318]">{guidance.callout}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {imageState === "loading" ? <p role="status" className="absolute text-sm font-semibold text-[#667085]">Loading screenshot…</p> : null}
        {imageState === "error" ? <p role="alert" className="absolute text-sm font-semibold text-[#b42318]">Screenshot could not be loaded.</p> : null}
      </div>
      <div className="mt-3 rounded-xl border border-[#fecaca] bg-white p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs font-bold text-[#b42318]">{issue.type}</p>
          <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#b42318]">{issue.severity}</span>
        </div>
        <p className="mt-2 text-base font-bold text-[#111827]">{guidance.title}</p>
        <p className="mt-1 text-[#344054]">{guidance.summary}</p>
        <dl className="mt-3 grid gap-2 rounded-lg bg-[#fff7f7] p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-[0.08em] text-[#b42318]">Where</dt>
            <dd className="mt-1 text-[#475467]">{guidance.location}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-[0.08em] text-[#b42318]">Why it matters</dt>
            <dd className="mt-1 text-[#475467]">{guidance.impact}</dd>
          </div>
        </dl>
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-[#e5edf7] bg-[#f8fbff] p-3">
            <p className="font-bold uppercase tracking-[0.08em] text-[#405168]">Common causes</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[#475467]">
              {guidance.commonCauses.map((cause) => <li key={cause}>{cause}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-[#d8eadf] bg-[#f4fbf6] p-3">
            <p className="font-bold uppercase tracking-[0.08em] text-[#24613a]">Suggested fixes</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[#24613a]">
              {guidance.suggestedFixes.map((fix) => <li key={fix}>{fix}</li>)}
            </ul>
          </div>
        </div>
        <p className="mt-2 rounded-lg bg-[#f7f8fb] px-3 py-2 text-xs text-[#667085]">{guidance.limitation}</p>
        <p className="mt-3 break-words font-mono text-xs text-[#667085]">Element: {issue.selectorHint ?? issue.elementRef}</p>
        {issue.foregroundColor && issue.backgroundColor && issue.contrastRatio !== undefined && issue.requiredContrastRatio !== undefined ? (
          <div className="mt-3 rounded-lg border border-[#e5edf7] bg-[#f8fbff] p-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-md border border-[#cbd5e1]" style={{ backgroundColor: issue.foregroundColor }} />
                <span><strong className="block text-[#344054]">Text</strong><code className="text-[#667085]">{issue.foregroundColor}</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-md border border-[#cbd5e1]" style={{ backgroundColor: issue.backgroundColor }} />
                <span><strong className="block text-[#344054]">Background</strong><code className="text-[#667085]">{issue.backgroundColor}</code></span>
              </div>
              <div className="ml-auto rounded-lg bg-white px-3 py-2 text-right">
                <strong className="block text-sm tabular-nums text-[#b42318]">{issue.contrastRatio.toFixed(2)}:1</strong>
                <span className="text-[#667085]">required {issue.requiredContrastRatio.toFixed(1)}:1</span>
              </div>
            </div>
            <p className="mt-3 text-[#475467]">Contrast ratio is below the WCAG AA threshold.</p>
            {issue.foregroundOklch && issue.backgroundOklch && issue.oklchDelta ? (
              <div className="mt-2 grid gap-2 rounded-lg bg-white p-3 font-mono text-[11px] text-[#475467] sm:grid-cols-3">
                <span>Text OKLCH {issue.foregroundOklch.l.toFixed(3)} / {issue.foregroundOklch.c.toFixed(3)} / {issue.foregroundOklch.h.toFixed(1)}°</span>
                <span>Background OKLCH {issue.backgroundOklch.l.toFixed(3)} / {issue.backgroundOklch.c.toFixed(3)} / {issue.backgroundOklch.h.toFixed(1)}°</span>
                <span>Delta L/C/H {issue.oklchDelta.lightness.toFixed(3)} / {issue.oklchDelta.chroma.toFixed(3)} / {issue.oklchDelta.hue.toFixed(1)}°</span>
              </div>
            ) : null}
            {issue.suggestedForegroundColor ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-[#cfe3d8] bg-[#f4fbf6] p-3 text-[#24613a]">
                <span className="size-7 rounded-md border border-[#a9cbb7]" style={{ backgroundColor: issue.suggestedForegroundColor }} />
                <span><strong className="block">Suggested text color <code>{issue.suggestedForegroundColor}</code></strong>Suggested color preserves approximate perceptual color while improving contrast.</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <details className="mt-2 text-xs text-[#667085]">
          <summary className="cursor-pointer font-semibold text-[#405168]">Technical evidence</summary>
          <p className="mt-1">{issue.message}</p>
          <p className="mt-1">{issue.threshold}</p>
        </details>
        {projection?.expandedWidth ? <p className="mt-2 text-xs font-semibold text-[#9a6700]">Legacy expanded-width screenshot is cropped to the audited viewport.</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[#667085]">
        <span className="inline-flex items-center gap-2"><span className="size-3 border-2 border-[#ef4444] bg-[#ef4444]/15" />Primary element</span>
        {issue.relatedBoundingBox ? <span className="inline-flex items-center gap-2"><span className="size-3 border-2 border-[#f59e0b] bg-[#f59e0b]/15" />Related element</span> : null}
      </div>
    </figure>
  );
}
