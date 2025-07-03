import "dotenv/config";
import { getFileContentsTool } from "./tools/getFileContentsTool.ts";
import * as path from "path";
import * as fs from "fs/promises";
import { updateReadmeAgentRunnable } from "./agents/updateReadmeAgent.ts";
import { researchAgent } from "./agents/researchAgent.ts";
import type { ResearchResult } from "./agents/researchAgent.ts";
import { linkFinderAgent } from "./agents/linkFinderAgent.ts";
import { model } from "./model.ts";
import { z } from "zod";

// Define ResearchContext type locally
interface ResearchContext {
  chain: Array<{ file: string; summary: string; links: string[] }>;
  parentFile?: string;
}

// --- Link Finder Agent: finds imported files in a TypeScript/JavaScript file ---
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// --- Master Agent ---
class MasterAgent {
  contextMap: Map<string, { summary: string; links: string[] }> = new Map();
  baseDirectory: string;
  entryFile: string;
  explored: Set<string> = new Set();
  question: string;

  constructor(baseDirectory: string, entryFile: string, question: string) {
    this.baseDirectory = baseDirectory;
    this.entryFile = entryFile;
    this.question = question;
  }

  async run() {
    let toExplore: Array<{ file: string; parentFile?: string }> = [{ file: this.entryFile }];
    let iteration = 0;
    while (toExplore.length > 0) {
      const { file, parentFile } = toExplore.shift()!;
      if (this.explored.has(file)) continue;
      // Build context chain
      const chain = Array.from(this.contextMap.entries()).map(([f, v]) => ({ file: f, summary: v.summary, links: v.links }));
      const context: ResearchContext = { chain, parentFile };
      // Research and link
      const research = await researchAgent(this.baseDirectory, file, this.question, context);
      const links = await linkFinderAgent(this.baseDirectory, file);
      this.contextMap.set(file, { summary: research.answer, links });
      this.explored.add(file);
      // Add unexplored links to queue
      for (const link of links) {
        if (!this.explored.has(link) && !toExplore.some(e => e.file === link)) {
          toExplore.push({ file: link, parentFile: file });
        }
      }
      // Add neededFiles from researchAgent to queue
      for (const needed of research.neededFiles) {
        if (!this.explored.has(needed) && !toExplore.some(e => e.file === needed)) {
          toExplore.push({ file: needed, parentFile: file });
        }
      }
      // After each iteration, update README
      const markdown = await this.buildMarkdown();
      await updateReadmeAgentRunnable.invoke({ newContent: markdown, reason: `Iteration ${++iteration}: added/updated ${file}` });
      console.log(`README updated after processing ${file}`);
    }
    // Final update after all files explored
    const finalMarkdown = await this.buildMarkdown();
    await updateReadmeAgentRunnable.invoke({ newContent: finalMarkdown, reason: "Final update: all files explored" });
    console.log("All files explored. Final context written to README.md");
  }

  async buildMarkdown() {
    let md = "# Code Chain Map\n\n";
    for (const [file, { links }] of this.contextMap.entries()) {
      md += `- **${file}**\n`;
      for (const link of links) {
        md += `  - links to: ${link}\n`;
      }
    }
    md += "\n# File Summaries\n\n";
    for (const [file, { summary }] of this.contextMap.entries()) {
      md += `## ${file}\n\n`;
      md += summary + "\n\n";
    }
    return md;
  }
}

// --- Run the master agent ---
async function main() {
  const baseDirectory = path.resolve("./src");
  const entryFile = "agentMaster.ts";
  const question = "How does this loop through to research?";
  const agent = new MasterAgent(baseDirectory, entryFile, question);
  await agent.run();
}

main(); 