import type { ScanIssue } from "@lutest/contracts";
import type { Rule } from "../rule.types";

const RULE_ID = "todo-comment";

export const todoCommentRule: Rule = {
  id: RULE_ID,

  run(context) {
    const issues: ScanIssue[] = [];

    context.sourceFiles.forEach((file) => {
      if (!/TODO|FIXME/i.test(file.content)) return;

      issues.push({
        id: `${RULE_ID}:${file.relativePath}`,
        type: "todo",
        severity: "info",
        message: `TODO/FIXME comment found in ${file.relativePath}`,
        filePath: file.relativePath,
      });
    });

    return issues;
  },
};