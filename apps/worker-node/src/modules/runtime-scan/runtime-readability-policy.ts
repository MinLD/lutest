export const WCAG_AA_NORMAL_TEXT_MIN_CONTRAST = 4.5;
export const WCAG_AA_LARGE_TEXT_MIN_CONTRAST = 3;
// WCAG large text is 18pt, or 14pt at bold weight; CSS uses 96px per inch.
export const WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX = 24;
export const WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX = 18.6667;
export const WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT = 700;

// Conservative evidence policy: skip visual composition that cannot be measured reliably.
export const MIN_AUDITABLE_FOREGROUND_ALPHA = 0.1;
export const MIN_OPAQUE_ELEMENT_OPACITY = 0.999;
export const DEFAULT_CANVAS_BACKGROUND = { red: 255, green: 255, blue: 255, alpha: 1 } as const;

export const RUNTIME_TEXT_REDACTION_RULES = [
  { source: "[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}", flags: "g", replacement: "[redacted-email]" },
  { source: "\\beyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\b", flags: "g", replacement: "[redacted-jwt]" },
  { source: "\\b(?:password|passwd|pwd|token|api[-_ ]?key|secret)\\s*[:=]\\s*[^\\s,;]+", flags: "gi", replacement: "[redacted-secret]" },
  { source: "\\b(?=[A-Za-z0-9_-]{32,}\\b)(?=[A-Za-z0-9_-]*[0-9_-])[A-Za-z0-9_-]{32,}\\b", flags: "g", replacement: "[redacted-token]" },
] as const;

export const redactRuntimeTextEvidence = (value: string): string =>
  RUNTIME_TEXT_REDACTION_RULES.reduce(
    (redacted, rule) => redacted.replace(new RegExp(rule.source, rule.flags), rule.replacement),
    value,
  );
