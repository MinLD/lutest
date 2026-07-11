import fs from "node:fs/promises";
import type { Page } from "playwright";
import type { RuntimeScanViewport } from "./runtime-scan.schema";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const positiveNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

export const captureRuntimeScreenshot = async (input: {
  page: Page;
  viewport: RuntimeScanViewport;
  outputPath: string;
}): Promise<void> => {
  const session = await input.page.context().newCDPSession(input.page);
  try {
    const metrics: unknown = await session.send("Page.getLayoutMetrics");
    const cssContentSize = isRecord(metrics) && isRecord(metrics.cssContentSize) ? metrics.cssContentSize : undefined;
    const contentHeight = positiveNumber(cssContentSize?.height);
    if (!contentHeight) throw new Error("Runtime screenshot document height is unavailable");

    const screenshot: unknown = await session.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: input.viewport.width,
        height: Math.max(input.viewport.height, Math.ceil(contentHeight)),
        scale: 1,
      },
    });
    const data = isRecord(screenshot) && typeof screenshot.data === "string" ? screenshot.data : undefined;
    if (!data) throw new Error("Runtime screenshot data is unavailable");
    await fs.writeFile(input.outputPath, Buffer.from(data, "base64"));
  } finally {
    await session.detach().catch(() => undefined);
  }
};
