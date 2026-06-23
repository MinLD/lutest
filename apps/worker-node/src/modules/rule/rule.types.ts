import type { ScanIssue } from "@lutest/contracts";
export interface RuleSourceFile {
  filePath: string;
  relativePath: string;
  content: string;
  lineCount: number;
}

export interface RuleContext {
  projectRoot: string;
  sourceFiles: RuleSourceFile[];
}

export interface Rule {
  id: string;
  run(context: RuleContext): Promise<ScanIssue[]> | ScanIssue[];
}
