import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const listFilesSchema = z.object({
  directory: z.string().describe("Directory to list files from"),
  filter: z.union([
    z.string(),
    z.object({ regexp: z.string(), flags: z.string().optional() })
  ]).nullable().describe("Filter (e.g., '.js', 'test', or { regexp, flags }). Pass null for no filter."),
  ignore: z.union([
    z.string(),
    z.object({ regexp: z.string(), flags: z.string().optional() })
  ]).nullable().describe("Ignore filter (e.g., 'Test.java' to exclude files containing this substring, or { regexp, flags }). Pass null for no ignore."),
});

type ListFilesArgs = z.infer<typeof listFilesSchema>;

type FilterLike = string | { regexp: string; flags?: string } | null;

function generateFilter(filter: FilterLike, baseDir: string) {
  if (filter && typeof filter === "object" && "regexp" in filter) {
    const re = new RegExp(filter.regexp, filter.flags || undefined);
    return (file: string) => re.test(path.join(baseDir, file));
  } else if (typeof filter === "string" && filter) {
    return (file: string) => file.includes(filter);
  } else {
    return () => true;
  }
}

function generateIgnore(ignore: FilterLike, baseDir: string) {
  if (ignore && typeof ignore === "object" && "regexp" in ignore) {
    const re = new RegExp(ignore.regexp, ignore.flags || undefined);
    return (file: string) => !re.test(path.join(baseDir, file));
  } else if (typeof ignore === "string" && ignore) {
    return (file: string) => !file.includes(ignore);
  } else {
    return () => true;
  }
}

export const listFilesTool = tool(
  async ({ directory, filter, ignore }: ListFilesArgs) => {
    try {
      const baseDir = path.resolve(directory);
      const files: string[] = await fs.readdir(baseDir, { recursive: true }) as string[];
      const filterFn = generateFilter(filter, baseDir);
      const ignoreFn = generateIgnore(ignore, baseDir);
      const filtered = files.filter(filterFn).filter(ignoreFn);
      return filtered.join('\n');
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
  {
    name: "list_files",
    description: "Recursively list files in a directory with a filter (string or regexp, applied to the full file path) and an ignore filter (string or regexp, also applied to the full file path, e.g., exclude files matching a pattern). Returns full relative paths.",
    schema: listFilesSchema,
  }
); 