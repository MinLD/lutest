import assert from "node:assert/strict";
import { chromium } from "playwright";
import { captureRuntimeDomGeometry } from "./runtime-dom-geometry";
import { DEFAULT_RUNTIME_SCAN_LIMITS } from "./runtime-scan-limits";

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await page.setContent(`<!doctype html>
      <html>
        <head><title>dom geometry self-check</title><style>.hidden { display: none; } .clip { overflow: hidden; width: 100px; height: 100px; }</style><meta name="x" content="y"></head>
        <body>
          <main id="hero" class="card primary" aria-label="Hero region">${"Visible text ".repeat(30)}</main>
          <input id="secret-input" value="DoNotLeakInputValue" />
          <textarea id="secret-textarea">DoNotLeakTextareaValue</textarea>
          <input id="secret-password" type="password" value="DoNotLeakPasswordValue" />
          <button role="button">Click me</button>
          <button id="zero-size" style="width:0;height:0;padding:0;border:0;overflow:visible">Visible zero size</button>
          <div class="clip"><div id="canvas-plane" style="transform: translateX(-200px)">Canvas plane</div></div>
          <script>window.__ignored = true;</script>
          <div class="hidden">Hidden text</div>
        </body>
      </html>`);

    const geometry = await captureRuntimeDomGeometry({
      page,
      viewport: { width: 800, height: 600 },
      limits: { ...DEFAULT_RUNTIME_SCAN_LIMITS, maxElementsPerViewport: 8, maxTextSnippetLength: 20 },
    });

    assert.equal(geometry.viewport.width, 800);
    assert.equal(geometry.truncated, true);
    assert.equal(geometry.elements.length, 8);
    assert(geometry.capturedAt.includes("T"));
    assert(!geometry.elements.some((element) => ["SCRIPT", "STYLE", "META", "LINK"].includes(element.tagName)));
    const serializedGeometry = JSON.stringify(geometry);
    assert(!serializedGeometry.includes("DoNotLeakInputValue"));
    assert(!serializedGeometry.includes("DoNotLeakTextareaValue"));
    assert(!serializedGeometry.includes("DoNotLeakPasswordValue"));

    const hero = geometry.elements.find((element) => element.id === "hero");
    assert(hero);
    assert.equal(hero?.selectorHint, "#hero");
    assert.equal(hero?.ariaLabel, "Hero region");
    assert((hero?.textSnippet?.length ?? 0) <= 20);
    assert((hero?.rect.width ?? 0) > 0);
    assert((hero?.rect.height ?? 0) > 0);
    assert.equal(hero?.visibility.display, "block");

    const button = geometry.elements.find((element) => element.tagName === "BUTTON");
    assert.equal(button?.clickable, true);
    const zeroSize = geometry.elements.find((element) => element.id === "zero-size");
    assert.equal(zeroSize?.rect.width, 0);
    assert.equal(zeroSize?.clickable, true);
    const canvasPlane = geometry.elements.find((element) => element.id === "canvas-plane");
    assert.equal(canvasPlane?.viewportBoundary?.horizontal, "clipped-ancestor");
    assert.equal(canvasPlane?.viewportBoundary?.vertical, "clipped-ancestor");
  } finally {
    await browser.close();
  }

  console.log("runtime DOM geometry self-check passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
