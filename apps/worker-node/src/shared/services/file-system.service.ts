import fs from "node:fs/promises";
import path from "node:path";

export interface ReadJsonFileInput {
  filePath: string;
}

export interface WriteJsonFileInput<TData> {
  filePath: string;
  data: TData;
}

export interface ListFilesInput {
  rootDir: string;
  extensions?: string[];
  ignoredDirs?: string[];
}
const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, {
    recursive: true,
  });
};
const readJsonFile = async <TData>(
  input: ReadJsonFileInput,
): Promise<TData | null> => {
  try {
    const row = await fs.readFile(input.filePath, "utf-8");
    return JSON.parse(row) as TData;
  } catch {
    return null;
  }
};

const writeJsonFile = async <TData>(
  input: WriteJsonFileInput<TData>,
): Promise<void> => {
  await ensureDir(path.dirname(input.filePath));

  await fs.writeFile(
    input.filePath,
    JSON.stringify(input.data, null, 2),
    "utf-8",
  );
};

const listFiles = async (input: ListFilesInput): Promise<string[]> => {
  const ignoredDirs = new Set(input.ignoredDirs ?? []);
  const extensions = input.extensions
    ? new Set(input.extensions.map((ext) => ext.toLowerCase()))
    : null;

  const result: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (ignoredDirs.has(entry.name)) return;
          await walk(fullPath);
          return;
        }
        

        if (!entry.isFile()) return;

        if (extensions) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!extensions.has(ext)) return;
        }

        result.push(fullPath);
      }),
    );
  };

  await walk(input.rootDir);
  return result;
};
export const fileSystemService = {
  pathExists,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  listFiles,
};
