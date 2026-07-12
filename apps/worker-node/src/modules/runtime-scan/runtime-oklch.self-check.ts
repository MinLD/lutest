import assert from "node:assert/strict";
import { hexToOklch, oklchDelta, oklchToHex, suggestForegroundForContrast, wcagContrastRatio } from "./runtime-oklch";

const red = hexToOklch("#ff0000");
assert(red, "valid hex converts to OKLCH");
assert(Math.abs(red.l - 0.628) < 0.001 && Math.abs(red.c - 0.258) < 0.001 && Math.abs(red.h - 29.234) < 0.01, "sRGB red uses deterministic OKLCH normalization");
assert.equal(oklchToHex(red), "#ff0000", "OKLCH round-trip preserves in-gamut red");
assert.equal(hexToOklch("rgb(255, 0, 0)"), undefined, "unsupported color syntax fails safely");

const foreground = hexToOklch("#999999");
const background = hexToOklch("#ffffff");
assert(foreground && background, "fixture colors convert");
const delta = oklchDelta(foreground, background);
assert(delta.lightness > 0 && delta.chroma >= 0 && delta.hue >= 0, "OKLCH delta is normalized and non-negative");

const suggestion = suggestForegroundForContrast({ foreground: "#999999", background: "#ffffff", requiredContrastRatio: 4.5 });
assert(suggestion, "low contrast foreground receives a suggestion");
assert((wcagContrastRatio(suggestion.color, "#ffffff") ?? 0) >= 4.5, "suggested foreground meets WCAG AA");
const suggestedOklch = hexToOklch(suggestion.color);
assert(suggestedOklch, "suggested foreground remains valid sRGB");
assert(Math.abs(suggestedOklch.h - foreground.h) <= 1 && Math.abs(suggestedOklch.c - foreground.c) <= 0.01, "suggestion preserves approximate OKLCH hue and chroma");
assert.equal(suggestForegroundForContrast({ foreground: "invalid", background: "#ffffff", requiredContrastRatio: 4.5 }), undefined, "conversion failure does not throw or emit suggestion");
assert.equal(suggestForegroundForContrast({ foreground: "#777777", background: "#777777", requiredContrastRatio: 22 }), undefined, "unreachable WCAG threshold emits no suggestion");

console.log("runtime OKLCH self-check passed");
