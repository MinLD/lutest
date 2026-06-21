import fs from "node:fs/promises";
import path from "node:path";

export interface PackageJsonData {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export const projectRepository = {
  // Kiểm tra file có tồn tại không
  async packageJsonExists(rootDir: string): Promise<boolean> {
    try {
      await fs.access(path.join(rootDir, "package.json"));
      return true;
    } catch {
      return false;
    }
  },
  // Đọc và parse file JSON
  async readPackageJson(rootDir: string): Promise<PackageJsonData | null> {
    try {
      const filePath = path.join(rootDir, "package.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as PackageJsonData;
    } catch {
      // Trả về null nếu file lỗi hoặc không tồn tại, giúp service xử lý an toàn
      return null;
    }
  },
};
