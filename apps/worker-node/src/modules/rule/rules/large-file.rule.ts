import type { ScanIssue } from "@lutest/contracts";
import type { Rule } from "../rule.types";

const RULE_ID = "large-file";
const MAX_LINES = 300;

export const largeFileRule: Rule = {
  id: RULE_ID,

  run(context) {
    const issues: ScanIssue[] = [];

    context.sourceFiles.forEach((file) => {
      if (file.lineCount <= MAX_LINES) return;

      issues.push({
        id: `${RULE_ID}:${file.relativePath}`,
        type: "unknown",
        severity: "warning",
        message: `Large file: ${file.relativePath} has ${file.lineCount} lines`,
        filePath: file.relativePath,
      });
    });

    return issues;
  },
};