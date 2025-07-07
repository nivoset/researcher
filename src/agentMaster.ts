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
  exploredAspects: Map<string, Set<string>> = new Map(); // file -> set of aspects analyzed
  question: string;

  constructor(baseDirectory: string, entryFile: string, question: string) {
    this.baseDirectory = baseDirectory;
    this.entryFile = entryFile;
    this.question = question;
  }

  async run() {
    let toExplore: Array<{ file: string; parentFile?: string; aspect?: string }> = [{ file: this.entryFile, aspect: 'summary' }];
    let iteration = 0;
    while (toExplore.length > 0) {
      const { file, parentFile, aspect = 'summary' } = toExplore.shift()!;
      // Check if this aspect of the file has already been analyzed
      if (this.exploredAspects.has(file) && this.exploredAspects.get(file)!.has(aspect)) continue;
      // Build context chain
      const chain = Array.from(this.contextMap.entries()).map(([f, v]) => ({ file: f, summary: v.summary, links: v.links }));
      const context: ResearchContext = { chain, parentFile };
      let research: ResearchResult | null = null;
      let links: string[] = [];
      try {
        research = await researchAgent(this.baseDirectory, file, this.question, context);
        if (research.error) {
          await updateReadmeAgentRunnable.invoke({
            newContent: `## Problems Encountered\n- Error in file ${file}: ${research.error}`,
            reason: `Error encountered in ${file}`,
          });
          const suggestion = await model.invoke(
            `The agent encountered this error: "${research.error}" while analyzing ${file}. What should it try next?`
          );
          await updateReadmeAgentRunnable.invoke({
            newContent: `## Agent Recovery Suggestion\n- For file ${file}: ${suggestion}`,
            reason: `Agent recovery suggestion for ${file}`,
          });
          // Mark this aspect as analyzed to avoid infinite loop on error
          if (!this.exploredAspects.has(file)) this.exploredAspects.set(file, new Set());
          this.exploredAspects.get(file)!.add(aspect);
          continue;
        }
        try {
          links = await linkFinderAgent(this.baseDirectory, file);
        } catch (err) {
          console.error('Error finding links in file', file, err);
          await updateReadmeAgentRunnable.invoke({
            newContent: `## Problems Encountered\n- Error finding links in file ${file}: ${err}`,
            reason: `Link finding error in ${file}`,
          });
          links = [];
        }
      } catch (err) {
        console.error('Unexpected error in file', file, err);
        await updateReadmeAgentRunnable.invoke({
          newContent: `## Problems Encountered\n- Unexpected error in file ${file}: ${err}`,
          reason: `Unexpected error in ${file}`,
        });
        // Mark this aspect as analyzed to avoid infinite loop on error
        if (!this.exploredAspects.has(file)) this.exploredAspects.set(file, new Set());
        this.exploredAspects.get(file)!.add(aspect);
        continue;
      }
      this.contextMap.set(file, { summary: research!.answer, links });
      // Mark this aspect as analyzed
      if (!this.exploredAspects.has(file)) this.exploredAspects.set(file, new Set());
      this.exploredAspects.get(file)!.add(aspect);
      // Add unexplored links to queue
      for (const link of links) {
        if (!this.exploredAspects.has(link) || !this.exploredAspects.get(link)!.has('summary')) {
          toExplore.push({ file: link, parentFile: file, aspect: 'summary' });
        }
      }
      // Add neededFiles from researchAgent to queue
      for (const needed of research!.neededFiles) {
        if (!this.exploredAspects.has(needed) || !this.exploredAspects.get(needed)!.has('summary')) {
          toExplore.push({ file: needed, parentFile: file, aspect: 'summary' });
        }
      }
      // If research used full file, mark 'full' as analyzed
      if (research!.answer && research!.answer.startsWith('[Full file used for context]')) {
        this.exploredAspects.get(file)!.add('full');
      }
      // After each iteration, update REVIEW
      const markdown = await this.buildMarkdown();
      await updateReadmeAgentRunnable.invoke({ newContent: markdown, reason: `Iteration ${++iteration}: added/updated ${file}` });
      console.log(`REVIEW updated after processing ${file}`);
    }
    // Final update after all files explored
    const finalMarkdown = await this.buildMarkdown();
    await updateReadmeAgentRunnable.invoke({ newContent: finalMarkdown, reason: "Final update: all files explored" });
    console.log("All files explored. Final context written to review.md");
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
  const question = "what is the loop this code does to research code? explain thuroughly and in detail";
  const agent = new MasterAgent(baseDirectory, entryFile, question);
  await agent.run();
}

main(); 