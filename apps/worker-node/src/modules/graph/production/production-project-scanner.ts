  import fs from "node:fs/promises";
  import path from "node:path";
  import type { DetectedFramework } from "@lutest/contracts";
  import type { ClassifiedSourceSymbol, ExtractedSourceFile } from "../source-extractors/source-extractor.types";
  import { sourceExtractorRegistry } from "../source-extractors/source-extractor-registry";
  import { classifyExtractedSourceFile } from "../adapters/classify-extracted-source-file";
  import { frameworkAdapterRegistry } from "../adapters/framework-adapter-registry";

  export type ScannedProductionSourceFile = {
    absolutePath: string;
    relativePath: string;
    extracted: ExtractedSourceFile;
    symbols: ClassifiedSourceSymbol[];
  };

  export type ProductionProjectScanResult = {
    rootDir: string;
    files: ScannedProductionSourceFile[];
  };

  const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".lutest", "coverage"]);

  const normalizePath = (value: string): string => value.replaceAll("\\", "/");

  const listSourceFiles = async (rootDir: string): Promise<string[]> => {
    const results: string[] = [];

    const visit = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) continue;
          await visit(path.join(dirPath, entry.name));
          continue;
        }
        if (!entry.isFile()) continue;
        const absolutePath = path.join(dirPath, entry.name);
        const relativePath = normalizePath(path.relative(rootDir, absolutePath));
        if (sourceExtractorRegistry.isSupportedSourceFile(relativePath)) results.push(absolutePath);
      }
    };

    await visit(rootDir);
    return results.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
  };

  export const scanProductionProjectSymbols = async (input: {
    rootDir: string;
    framework?: DetectedFramework;
  }): Promise<ProductionProjectScanResult> => {
    const adapter = input.framework === undefined
      ? await frameworkAdapterRegistry.getAdapterForProject(input.rootDir)
      : frameworkAdapterRegistry.getAdapterForFramework(input.framework);
    const sourceFilePaths = await listSourceFiles(input.rootDir);
    const files: ScannedProductionSourceFile[] = [];

    for (const absolutePath of sourceFilePaths) {
      const content = await fs.readFile(absolutePath, "utf-8");
      const relativePath = normalizePath(path.relative(input.rootDir, absolutePath));
      const extracted = sourceExtractorRegistry.extract({ filePath: relativePath, content });
      files.push({
        absolutePath: normalizePath(absolutePath),
        relativePath,
        extracted,
        symbols: classifyExtractedSourceFile({
          relativePath,
          parsed: extracted,
          adapter,
        }),
      });
    }

    return { rootDir: normalizePath(input.rootDir), files };
  };
