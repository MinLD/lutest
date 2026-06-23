import fs from "node:fs/promises";
import path from "node:path";
import type { ScanIssue } from "@lutest/contracts";
import type { Rule, RuleSourceFile } from "./rule.types";
import { noConsoleRule } from "./rules/no-console.rule";
import { todoCommentRule } from "./rules/todo-comment.rule";
import { largeFileRule } from "./rules/large-file.rule";

export interface RunRulesInput {
  projectRoot: string;
  sourceFiles: string[];
}

const normalizePath = (value: string): string => {
  return value.replaceAll("\\", "/");
};

const rules: Rule[] = [noConsoleRule, todoCommentRule, largeFileRule];

const readSourceFile = async (
  projectRoot: string,
  filePath: string,
): Promise<RuleSourceFile> => {
  const content = await fs.readFile(filePath, "utf-8");
  const relativePath = normalizePath(path.relative(projectRoot, filePath));

  return {
    filePath,
    relativePath,
    content,
    lineCount: content.split(/\r?\n/).length,
  };
};

const runRules = async (input: RunRulesInput): Promise<ScanIssue[]> => {
  const sourceFiles = await Promise.all(
    input.sourceFiles.map((filePath) =>
      readSourceFile(input.projectRoot, filePath),
    ),
  );

  const issueGroups = await Promise.all(
    rules.map((rule) =>
      rule.run({
        projectRoot: input.projectRoot,
        sourceFiles,
      }),
    ),
  );

  return issueGroups.flat();
};

export const ruleEngine = {
  runRules,
};