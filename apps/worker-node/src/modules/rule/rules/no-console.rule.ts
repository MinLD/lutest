import type { ScanIssue } from "@lutest/contracts";
import type { Rule } from "../rule.types";

const RULE_ID = "no-console";

export const noConsoleRule: Rule = {
  id: RULE_ID,

  run(context) {
    const issues: ScanIssue[] = [];

    context.sourceFiles.forEach((file) => {
      if (!file.content.includes("console.")) return;

      issues.push({
        id: `${RULE_ID}:${file.relativePath}`,
        type: "console",
        severity: "warning",
        message: `console.* found in ${file.relativePath}`,
        filePath: file.relativePath,
      });
    });

    return issues;
  },
};