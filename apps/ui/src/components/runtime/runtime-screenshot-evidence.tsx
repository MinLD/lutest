"use client";

import { useState } from "react";
import { runtimeScreenshotUrl } from "@/lib/api-client";
import {
  runtimeOverlayEdgeMarker,
  runtimeOverlayRect,
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
  const primaryRect = naturalSize ? runtimeOverlayRect(issue.boundingBox, issue.viewport, naturalSize) : undefined;
  const relatedRect = naturalSize ? runtimeOverlayRect(issue.relatedBoundingBox, issue.viewport, naturalSize) : undefined;
  const edgeMarker = naturalSize && !primaryRect ? runtimeOverlayEdgeMarker(issue.boundingBox, issue.viewport, naturalSize) : undefined;
  const targetX = primaryRect ? primaryRect.leftPercent + primaryRect.widthPercent / 2 : edgeMarker?.xPercent;
  const targetY = primaryRect ? primaryRect.topPercent + primaryRect.heightPercent / 2 : edgeMarker?.yPercent;
  const targetTop = primaryRect?.topPercent ?? targetY;
  const targetBottom = primaryRect ? primaryRect.topPercent + primaryRect.heightPercent : targetY;
  const annotationBelow = (targetBottom ?? 0) < 70;
  const annotationLeft = targetX ?? 50;

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
            className={`absolute inset-x-0 top-0 block h-auto w-full ${imageState === "error" ? "invisible" : ""}`}
            onLoad={(event) => {
              setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
              setImageState("loaded");
            }}
            onError={() => setImageState("error")}
          />
          {imageState === "loaded" && primaryRect ? <OverlayBox rect={primaryRect} /> : null}
          {imageState === "loaded" && relatedRect ? <OverlayBox rect={relatedRect} related /> : null}
          {imageState === "loaded" && edgeMarker ? (
            <span className="pointer-events-none absolute z-20 rounded-md bg-[#dc2626] px-2 py-1 text-[10px] font-bold text-white shadow-lg" style={edgeMarkerPosition(edgeMarker.side, edgeMarker.positionPercent)}>
              Outside {edgeMarker.side} · {Math.round(edgeMarker.distancePx)}px
            </span>
          ) : null}
          {imageState === "loaded" && targetX !== undefined && targetY !== undefined ? (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="runtime-evidence-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L9,4.5 L0,9 Z" fill="#dc2626" />
                </marker>
              </defs>
              <line
                x1={targetX}
                y1={annotationBelow ? Math.min(100, (targetBottom ?? targetY) + 8) : Math.max(0, (targetTop ?? targetY) - 8)}
                x2={targetX}
                y2={annotationBelow ? targetBottom ?? targetY : targetTop ?? targetY}
                stroke="#dc2626"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#runtime-evidence-arrow)"
              />
            </svg>
          ) : null}
          {imageState === "loaded" ? (
            <div
              className="pointer-events-none absolute z-30 rounded-xl border border-[#fecaca] bg-white/95 p-3 text-left shadow-xl backdrop-blur"
              style={{
                left: `clamp(0.5rem, calc(${annotationLeft}% - 2rem), calc(100% - 18.5rem))`,
                width: "min(18rem, calc(100% - 1rem))",
                ...(annotationBelow
                  ? { top: `calc(${targetBottom ?? targetY ?? 0}% + 2.75rem)` }
                  : { bottom: `calc(${100 - (targetTop ?? targetY ?? 100)}% + 2.75rem)` }),
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold text-[#b42318]">{issue.type}</p>
                <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#b42318]">{issue.severity}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#344054]">{issue.message}</p>
              <p className="mt-1 break-words font-mono text-[11px] text-[#667085]">{issue.selectorHint ?? issue.elementRef}</p>
              <p className="mt-1 text-[11px] text-[#667085]">{issue.threshold}</p>
            </div>
          ) : null}
        </div>
        {imageState === "loading" ? <p role="status" className="absolute text-sm font-semibold text-[#667085]">Loading screenshot…</p> : null}
        {imageState === "error" ? <p role="alert" className="absolute text-sm font-semibold text-[#b42318]">Screenshot could not be loaded.</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[#667085]">
        <span className="inline-flex items-center gap-2"><span className="size-3 border-2 border-[#ef4444] bg-[#ef4444]/15" />Primary element</span>
        {issue.relatedBoundingBox ? <span className="inline-flex items-center gap-2"><span className="size-3 border-2 border-[#f59e0b] bg-[#f59e0b]/15" />Related element</span> : null}
      </div>
    </figure>
  );
}
