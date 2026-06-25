import fs from "node:fs/promises";
import path from "node:path";

export interface PackageJsonData {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export const projectRepository = {
  async packageJsonExists(rootDir: string): Promise<boolean> {
    try {
      await fs.access(path.join(rootDir, "package.json"));
      return true;
    } catch {
      return false;
    }
  },
  async readPackageJson(rootDir: string): Promise<PackageJsonData | null> {
    try {
      const filePath = path.join(rootDir, "package.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as PackageJsonData;
    } catch {
      return null;
    }
  },
};
