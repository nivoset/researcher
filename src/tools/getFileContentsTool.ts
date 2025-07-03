import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { extractTypeScriptBlocks } from "./extractors/typescript.ts";
import { extractJavaBlocks } from "./extractors/java.ts";
import { extractJavaScriptBlocks } from "./extractors/javascript.ts";

export const getFileContentsTool = tool(
  async ({ baseDirectory, files, full }: { baseDirectory: string; files: string[]; full?: boolean }) => {
    const baseDir = path.resolve(baseDirectory);
    const results: string[] = [];
    for (const relPath of files) {
      const absPath = path.join(baseDir, relPath);
      let content: string;
      try {
        content = await fs.readFile(absPath, "utf8");
        if (!full) {
          const ext = path.extname(relPath).toLowerCase();
          switch (ext) {
            case ".ts":
              content = extractTypeScriptBlocks(content);
              break;
            case ".java":
              content = extractJavaBlocks(content);
              break;
            case ".js":
              content = extractJavaScriptBlocks(content);
              break;
            default:
              // No simplification
              break;
          }
        }
      } catch (err: any) {
        content = `Error: ${err.message}`;
      }
      results.push(`--- FILE: ${relPath} ---\n${content}\n`);
    }
    return results.join('\n\n');
  },
  {
    name: "get_file_contents",
    description: "Given a base directory and a list of relative file paths, return a single string with each file's name and contents, separated by breaks. If 'full' is true, return the full file content. Otherwise, return a summary (for .ts, .java, .js files, only key structure and exports).",
    schema: z.object({
      baseDirectory: z.string().describe("Base directory for the relative file paths."),
      files: z.array(z.string()).describe("Array of relative file paths to read."),
      full: z.boolean().nullish().describe("If true, return the full file content. If false or omitted, return the summary/extracted structure."),
    }),
  }
); 