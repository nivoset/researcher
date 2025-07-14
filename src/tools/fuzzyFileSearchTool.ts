import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import FuzzySearch from "fuzzy-search";
import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguages, SupportedTextSplitterLanguage } from "@langchain/textsplitters";

const fuzzyFileSearchSchema = z.object({
  directory: z.string().describe("Directory to search files in"),
  fuzzy: z.string().describe("Fuzzy search string for file names"),
  topN: z.number().optional().describe("Number of top results to return (default 10)"),
  split: z.enum(["none", "lines", "code"]).optional().describe("How to split file contents for ranking: none, lines, or code blocks"),
  fileExtensions: z.array(z.string()).optional().describe("File extensions to include (e.g., ['.ts', '.js'])")
});

type FuzzyFileSearchArgs = z.infer<typeof fuzzyFileSearchSchema>;

async function getAllFiles(dir: string, exts: string[] = []): Promise<string[]> {
  let results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await getAllFiles(fullPath, exts));
    } else {
      if (exts.length === 0 || exts.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function getLangForExt(ext: string): SupportedTextSplitterLanguage | undefined {
  switch (ext) {
    case ".js":
    case ".ts":
    case ".jsx":
    case ".tsx":
      return "js";
    case ".java":
      return "java";
    case ".py":
      return "python";
    case ".go":
      return "go";
    case ".cpp":
    case ".cc":
    case ".cxx":
    case ".hpp":
    case ".h":
      return "cpp";
    case ".rb":
      return "ruby";
    case ".php":
      return "php";
    case ".rs":
      return "rust";
    case ".scala":
      return "scala";
    case ".swift":
      return "swift";
    case ".md":
      return "markdown";
    case ".html":
    case ".htm":
    case ".xhtml":
    case ".jsp":
      return "html";
    case ".tex":
      return "latex";
    case ".proto":
      return "proto";
    default:
      return undefined;
  }
}

function makeLoadFn(absPath: string, chunkIndex?: number, splitType?: "lines" | "code", lang?: SupportedTextSplitterLanguage) {
  return async () => {
    let content = await fs.readFile(absPath, "utf8");
    if (splitType && chunkIndex !== undefined) {
      if (splitType === "lines") {
        const lines = content.split(/\r?\n/).filter(Boolean);
        return lines[chunkIndex] || "";
      } else if (splitType === "code" && lang) {
        const splitter = RecursiveCharacterTextSplitter.fromLanguage(lang, { chunkSize: 1000, chunkOverlap: 200 });
        const chunks = await splitter.splitText(content);
        return chunks[chunkIndex] || "";
      }
    }
    return content;
  };
}

export const fuzzyFileSearchTool = tool(
  async ({ directory, fuzzy, topN = 10, split = "none", fileExtensions = [] }: FuzzyFileSearchArgs) => {
    const baseDir = path.resolve(directory);
    let files: string[] = [];
    try {
      files = await getAllFiles(baseDir, fileExtensions);
    } catch (err: any) {
      return { error: `Error reading directory: ${err.message}` };
    }
    // Make file paths relative to baseDir for output
    const relFiles = files.map(f => path.relative(baseDir, f));
    // Fuzzy search on file names
    const searcher = new FuzzySearch(relFiles, undefined, { sort: true });
    const results = searcher.search(fuzzy).slice(0, topN);
    // Optionally, split file contents for more granular search
    if (split !== "none") {
      const splitResults: Array<{ file: string; chunkIndex: number; load: () => Promise<string> }> = [];
      for (const relPath of results) {
        const absPath = path.join(baseDir, relPath);
        let content = "";
        try {
          content = await fs.readFile(absPath, "utf8");
        } catch (err: any) {
          continue;
        }
        let chunks: string[] = [];
        let lang: SupportedTextSplitterLanguage | undefined = undefined;
        if (split === "code") {
          const ext = path.extname(relPath).toLowerCase();
          lang = getLangForExt(ext);
          if (lang && (SupportedTextSplitterLanguages as readonly string[]).includes(lang)) {
            const splitter = RecursiveCharacterTextSplitter.fromLanguage(lang, { chunkSize: 1000, chunkOverlap: 200 });
            chunks = await splitter.splitText(content);
          } else {
            // fallback to lines if unknown extension
            chunks = content.split(/\r?\n/).filter(Boolean);
          }
        } else if (split === "lines") {
          chunks = content.split(/\r?\n/).filter(Boolean);
        }
        for (let i = 0; i < chunks.length; i++) {
          splitResults.push({
            file: relPath,
            chunkIndex: i,
            load: makeLoadFn(absPath, i, split as "lines" | "code", lang),
          });
        }
      }
      return { results: splitResults };
    }
    // For non-split, return file objects with load()
    const fileResults = results.map(relPath => {
      const absPath = path.join(baseDir, relPath);
      return {
        file: relPath,
        load: makeLoadFn(absPath),
      };
    });
    return { results: fileResults };
  },
  {
    name: "fuzzy_file_search",
    description: "Recursively search for files in a directory using fuzzy search on file names. Optionally split file contents by lines or code blocks for more granular search. Uses LangChain's code-aware splitters for code files. Returns a ranked list of file objects, each with a load() method to get contents.",
    schema: fuzzyFileSearchSchema,
  }
); 