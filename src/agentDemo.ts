import "dotenv/config";
import { listFilesTool } from "./tools/listFilesTool.ts";
import { getFileContentsTool } from "./tools/getFileContentsTool.ts";
import * as path from "path";
import * as fs from "fs/promises";

// --- Research Agent: summarizes a file ---
async function researchAgent(baseDirectory: string, file: string): Promise<string> {
  const result = await getFileContentsTool.invoke({
    baseDirectory,
    files: [file],
    full: false,
  });
  return result;
}

// --- Link Finder Agent: finds imported files in a TypeScript/JavaScript file ---
async function linkFinderAgent(baseDirectory: string, file: string): Promise<string[]> {
  // Get file content
  const result = await getFileContentsTool.invoke({
    baseDirectory,
    files: [file],
    full: true,
  });
  // Find import statements (very basic, works for .ts/.js)
  const importRegex = /^import\s+.*?['"](.+?)['"];?/gm;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(result)) !== null) {
    let importPath = match[1];
    // Only consider relative imports
    if (importPath.startsWith(".")) {
      // Try to resolve to a file in the sample folder
      let resolved = importPath;
      if (!resolved.endsWith(".ts") && !resolved.endsWith(".js")) {
        if (await fileExists(path.join(baseDirectory, resolved + ".ts"))) {
          resolved += ".ts";
        } else if (await fileExists(path.join(baseDirectory, resolved + ".js"))) {
          resolved += ".js";
        }
      }
      // Remove leading ./
      if (resolved.startsWith("./")) resolved = resolved.slice(2);
      links.push(resolved);
    }
  }
  return links;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// --- Chain Context Agent ---
class ChainContextAgent {
  contextMap: Map<string, { summary: string; links: string[] }> = new Map();
  baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
  }

  async trace(file: string) {
    if (this.contextMap.has(file)) return; // Avoid cycles
    const summary = await researchAgent(this.baseDirectory, file);
    const links = await linkFinderAgent(this.baseDirectory, file);
    this.contextMap.set(file, { summary, links });
    for (const link of links) {
      await this.trace(link);
    }
  }

  printMarkdownChain() {
    let md = "# Code Chain Map\n\n";
    for (const [file, { links }] of this.contextMap.entries()) {
      md += `- **${file}**\n`;
      for (const link of links) {
        md += `  - links to: ${link}\n`;
      }
    }
    return md;
  }

  printSummaries() {
    let md = "# File Summaries\n\n";
    for (const [file, { summary }] of this.contextMap.entries()) {
      md += `## ${file}\n\n`;
      md += summary + "\n\n";
    }
    return md;
  }
}

// --- Demo Runner ---
async function main() {
  const baseDirectory = path.resolve("./src/tools/sample");
  const entryFile = "Sample.ts";
  const agent = new ChainContextAgent(baseDirectory);
  await agent.trace(entryFile);
  console.log(agent.printMarkdownChain());
  console.log(agent.printSummaries());
}

main(); 