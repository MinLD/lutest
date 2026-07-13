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
          <div class="hidden">Hidden text <button id="hidden-child">Hidden child</button></div>
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
    assert(!geometry.elements.some((element) => element.id === "hidden-child"), "children hidden by ancestor display:none are not captured");
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

    await page.setContent(`<!doctype html><html><body style="background:#808080;color:#f1c9a8">
      <p id="inherited-text">Inherited foreground</p>
      <div style="background:rgba(255,255,255,.5)"><p id="composited-text" style="color:#c5cad1">Composited background</p></div>
      <p id="transparent-text" style="opacity:.5">Skipped transparent text</p>
      <p id="shadow-text" style="text-shadow:0 1px 1px #000">Skipped shadow text</p>
      <p id="sensitive-text">Contact user@example.com token=abcdefghijklmnopqrstuvwxyz1234567890</p>
      <button id="sensitive-label" aria-label="Account user@example.com">Open</button>
      <div style="background-image:linear-gradient(#fff,#ddd)"><p id="gradient-text">Skipped gradient text</p></div>
      <p id="aria-hidden-text" aria-hidden="true">Skipped hidden evidence</p>
    </body></html>`);
    const styleGeometry = await captureRuntimeDomGeometry({ page, viewport: { width: 800, height: 600 }, limits: { ...DEFAULT_RUNTIME_SCAN_LIMITS, maxElementsPerViewport: 20 } });
    const inheritedText = styleGeometry.elements.find((element) => element.id === "inherited-text");
    assert.equal(inheritedText?.textStyle?.foregroundColor, "#f1c9a8", "inherited computed foreground captured");
    assert.equal(inheritedText?.textStyle?.backgroundColor, "#808080", "solid ancestor background captured");
    const compositedText = styleGeometry.elements.find((element) => element.id === "composited-text");
    assert.equal(compositedText?.textStyle?.backgroundColor, "#c0c0c0", "transparent background composited over ancestor");
    assert.equal(styleGeometry.elements.find((element) => element.id === "transparent-text")?.textStyle, undefined, "transparent element skipped");
    assert.equal(styleGeometry.elements.find((element) => element.id === "shadow-text")?.textStyle, undefined, "text shadow skipped instead of guessed");
    assert.equal(styleGeometry.elements.find((element) => element.id === "sensitive-text")?.textSnippet, "Contact [redacted-email] [redacted-secret]", "sensitive rendered text redacted before capture");
    assert.equal(styleGeometry.elements.find((element) => element.id === "sensitive-label")?.ariaLabel, "Account [redacted-email]", "sensitive aria label redacted before capture");
    assert.equal(styleGeometry.readabilityCoverage?.candidateTextCount, 8, "readability coverage counts direct text candidates");
    assert.equal(styleGeometry.readabilityCoverage?.checkedTextCount, 4, "readability coverage counts checked text");
    assert.equal(styleGeometry.readabilityCoverage?.skippedTextCount, 4, "readability coverage counts unsupported text");
    assert.equal(styleGeometry.readabilityCoverage?.skippedByReason["background-image"], 1, "gradient background skip is typed");
    assert.equal(styleGeometry.readabilityCoverage?.skippedByReason["aria-hidden"], 1, "aria-hidden skip is typed");
    assert.equal(styleGeometry.readabilityCoverage?.incomplete, false, "complete DOM capture reports complete readability coverage");
  } finally {
    await browser.close();
  }

  console.log("runtime DOM geometry self-check passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
