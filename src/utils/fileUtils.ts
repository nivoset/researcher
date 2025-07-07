import fs from "fs/promises";
import path from "path";

export type FilterLike = string | { regexp: string; flags?: string } | null;

export function generateFilter(filter: FilterLike, baseDir: string) {
  if (filter && typeof filter === "object" && "regexp" in filter) {
    const re = new RegExp(filter.regexp, filter.flags || undefined);
    return (file: string) => re.test(path.join(baseDir, file));
  } else if (typeof filter === "string" && filter) {
    return (file: string) => file.includes(filter);
  } else {
    return () => true;
  }
}

export function generateIgnore(ignore: FilterLike, baseDir: string) {
  if (ignore && typeof ignore === "object" && "regexp" in ignore) {
    const re = new RegExp(ignore.regexp, ignore.flags || undefined);
    return (file: string) => !re.test(path.join(baseDir, file));
  } else if (typeof ignore === "string" && ignore) {
    return (file: string) => !file.includes(ignore);
  } else {
    return () => true;
  }
}

/**
 * Recursively list files in a directory with optional filter and ignore.
 * Returns full relative paths.
 */
export async function listFilesRecursive(
  directory: string,
  filter: FilterLike = null,
  ignore: FilterLike = null
): Promise<string[]> {
  const baseDir = path.resolve(directory);
  const files: string[] = await fs.readdir(baseDir, { recursive: true }) as string[];
  const filterFn = generateFilter(filter, baseDir);
  const ignoreFn = generateIgnore(ignore, baseDir);
  return files.filter(filterFn).filter(ignoreFn);
} 