export type RuntimeOklchColor = {
  l: number;
  c: number;
  h: number;
};

export type RuntimeOklchDelta = {
  lightness: number;
  chroma: number;
  hue: number;
};

type Rgb = { red: number; green: number; blue: number };
type Oklab = { l: number; a: number; b: number };

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const FULL_CIRCLE_DEGREES = 360;
const HALF_CIRCLE_DEGREES = 180;
const GAMUT_SEARCH_ITERATIONS = 18;
const LIGHTNESS_SEARCH_ITERATIONS = 28;
const GAMUT_EPSILON = 1e-7;
const CONTRAST_EPSILON = 1e-9;

const round = (value: number, precision = 6): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const parseHex = (value: string): Rgb | undefined => {
  const match = HEX_COLOR.exec(value);
  if (!match) return undefined;
  return {
    red: Number.parseInt(match[1] ?? "", 16) / 255,
    green: Number.parseInt(match[2] ?? "", 16) / 255,
    blue: Number.parseInt(match[3] ?? "", 16) / 255,
  };
};

const linearize = (channel: number): number => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const delinearize = (channel: number): number => channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

const rgbToOklab = (rgb: Rgb): Oklab => {
  const red = linearize(rgb.red);
  const green = linearize(rgb.green);
  const blue = linearize(rgb.blue);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

const oklabToLinearRgb = (color: Oklab): Rgb => {
  const lRoot = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return {
    red: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    green: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    blue: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
};

const oklchToOklab = (color: RuntimeOklchColor): Oklab => {
  const radians = color.h * Math.PI / HALF_CIRCLE_DEGREES;
  return { l: color.l, a: color.c * Math.cos(radians), b: color.c * Math.sin(radians) };
};

const normalizedHue = (degrees: number): number => ((degrees % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;

export const hexToOklch = (value: string): RuntimeOklchColor | undefined => {
  const rgb = parseHex(value);
  if (!rgb) return undefined;
  const lab = rgbToOklab(rgb);
  const chroma = Math.sqrt(lab.a ** 2 + lab.b ** 2);
  return {
    l: round(lab.l),
    c: round(chroma),
    h: round(chroma < Number.EPSILON ? 0 : normalizedHue(Math.atan2(lab.b, lab.a) * HALF_CIRCLE_DEGREES / Math.PI)),
  };
};

const inSrgbGamut = (rgb: Rgb): boolean =>
  rgb.red >= -GAMUT_EPSILON && rgb.red <= 1 + GAMUT_EPSILON
  && rgb.green >= -GAMUT_EPSILON && rgb.green <= 1 + GAMUT_EPSILON
  && rgb.blue >= -GAMUT_EPSILON && rgb.blue <= 1 + GAMUT_EPSILON;

const channelHex = (channel: number): string => Math.round(Math.min(1, Math.max(0, delinearize(channel))) * 255).toString(16).padStart(2, "0");

export const oklchToHex = (color: RuntimeOklchColor): string | undefined => {
  if (!Number.isFinite(color.l) || color.l < 0 || color.l > 1 || !Number.isFinite(color.c) || color.c < 0 || !Number.isFinite(color.h)) return undefined;
  const rgb = oklabToLinearRgb(oklchToOklab({ ...color, h: normalizedHue(color.h) }));
  if (!inSrgbGamut(rgb)) return undefined;
  return `#${channelHex(rgb.red)}${channelHex(rgb.green)}${channelHex(rgb.blue)}`;
};

const gamutMappedHex = (color: RuntimeOklchColor): string | undefined => {
  const direct = oklchToHex(color);
  if (direct) return direct;
  let lowerChroma = 0;
  let upperChroma = color.c;
  let best = oklchToHex({ ...color, c: 0 });
  for (let iteration = 0; iteration < GAMUT_SEARCH_ITERATIONS; iteration += 1) {
    const chroma = (lowerChroma + upperChroma) / 2;
    const candidate = oklchToHex({ ...color, c: chroma });
    if (candidate) {
      best = candidate;
      lowerChroma = chroma;
    } else {
      upperChroma = chroma;
    }
  }
  return best;
};

const relativeLuminance = (hex: string): number | undefined => {
  const rgb = parseHex(hex);
  if (!rgb) return undefined;
  return 0.2126 * linearize(rgb.red) + 0.7152 * linearize(rgb.green) + 0.0722 * linearize(rgb.blue);
};

export const wcagContrastRatio = (foreground: string, background: string): number | undefined => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === undefined || backgroundLuminance === undefined) return undefined;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const oklchDelta = (first: RuntimeOklchColor, second: RuntimeOklchColor): RuntimeOklchDelta => {
  const hueDistance = Math.abs(first.h - second.h);
  return {
    lightness: round(Math.abs(first.l - second.l)),
    chroma: round(Math.abs(first.c - second.c)),
    hue: round(Math.min(hueDistance, FULL_CIRCLE_DEGREES - hueDistance)),
  };
};

const oklabDistance = (first: RuntimeOklchColor, second: RuntimeOklchColor): number => {
  const firstLab = oklchToOklab(first);
  const secondLab = oklchToOklab(second);
  return Math.sqrt((firstLab.l - secondLab.l) ** 2 + (firstLab.a - secondLab.a) ** 2 + (firstLab.b - secondLab.b) ** 2);
};

export const suggestForegroundForContrast = (input: {
  foreground: string;
  background: string;
  requiredContrastRatio: number;
}): { color: string; reason: string } | undefined => {
  const foregroundOklch = hexToOklch(input.foreground);
  if (!foregroundOklch || !hexToOklch(input.background) || !Number.isFinite(input.requiredContrastRatio) || input.requiredContrastRatio <= 1) return undefined;
  const currentRatio = wcagContrastRatio(input.foreground, input.background);
  if (currentRatio === undefined || currentRatio + CONTRAST_EPSILON >= input.requiredContrastRatio) return undefined;

  const candidates: Array<{ color: string; distance: number }> = [];
  for (const endpoint of [0, 1]) {
    const endpointColor = gamutMappedHex({ ...foregroundOklch, l: endpoint });
    const endpointRatio = endpointColor ? wcagContrastRatio(endpointColor, input.background) : undefined;
    if (!endpointColor || endpointRatio === undefined || endpointRatio + CONTRAST_EPSILON < input.requiredContrastRatio) continue;
    let failingProgress = 0;
    let passingProgress = 1;
    for (let iteration = 0; iteration < LIGHTNESS_SEARCH_ITERATIONS; iteration += 1) {
      const progress = (failingProgress + passingProgress) / 2;
      const lightness = foregroundOklch.l + (endpoint - foregroundOklch.l) * progress;
      const candidate = gamutMappedHex({ ...foregroundOklch, l: lightness });
      const ratio = candidate ? wcagContrastRatio(candidate, input.background) : undefined;
      if (ratio !== undefined && ratio + CONTRAST_EPSILON >= input.requiredContrastRatio) passingProgress = progress;
      else failingProgress = progress;
    }
    const lightness = foregroundOklch.l + (endpoint - foregroundOklch.l) * passingProgress;
    const color = gamutMappedHex({ ...foregroundOklch, l: lightness });
    const converted = color ? hexToOklch(color) : undefined;
    const ratio = color ? wcagContrastRatio(color, input.background) : undefined;
    if (color && converted && ratio !== undefined && ratio + CONTRAST_EPSILON >= input.requiredContrastRatio) {
      candidates.push({ color, distance: oklabDistance(foregroundOklch, converted) });
    }
  }
  const best = candidates.sort((left, right) => left.distance - right.distance || left.color.localeCompare(right.color))[0];
  if (!best) return undefined;
  return {
    color: best.color,
    reason: `Adjust foreground OKLCH lightness while preserving approximate hue/chroma to meet WCAG AA ${input.requiredContrastRatio}:1.`,
  };
};
