import "dotenv/config";
import * as path from "path";
import * as fs from "fs/promises";
// Remove: import * as fssync from "fs";
import { updateReadmeAgentRunnable } from "./agents/updateReadmeAgent.ts";
import { researchAgent } from "./agents/researchAgent.ts";
import type { ResearchResult } from "./agents/researchAgent.ts";
import { linkFinderAgent } from "./agents/linkFinderAgent.ts";
import { model } from "./model.ts";

// Define ResearchContext type locally
interface ResearchContext {
  chain: Array<{ file: string; summary: string; links: string[] }>;
  parentFile?: string;
}

// Helper to slugify a string for filenames
function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

// Helper to generate a title for a file using the LLM
async function generateTitle(file: string, summary: string): Promise<string> {
  try {
    const prompt = `Generate a concise, descriptive title (max 10 words) for a code file based on its filename and the following summary. Do not include the file extension.\n\nFilename: ${file}\nSummary: ${summary}`;
    const result = await model.invoke(prompt);
    // result.content may be a string or an array (multimodal)
    let text = "";
    if (typeof result.content === "string") {
      text = result.content;
    } else if (Array.isArray(result.content)) {
      text = result.content.filter(x => typeof x === "string").join(" ");
    } else {
      text = "Code File";
    }
    return text.replace(/\n/g, " ").trim() || "Code File";
  } catch {
    return "Code File";
  }
}

// Helper to save a per-file .md in notes/<timestamp>/ with explanation, use case, abstraction, used functions/abstractions, and imports
async function saveFileNote(baseDirectory: string, file: string, summary: string, notesDir: string, links: string[], timestamp: string) {
  try {
    const title = await generateTitle(file, summary);
    // Use LLM to generate explanation, use case, abstraction, used functions/abstractions, and imports
    const prompt = `Given the following summary for the file '${file}', and the following list of files it imports or links to: ${links.join(", ")}, write:\n1. A concise explanation of what this file does (1-2 sentences).\n2. A short description of the use case for this file (how/when/why it is used).\n3. What this file abstracts or what responsibility it encapsulates in the codebase.\n4. A list of the main functions or abstractions this file uses (e.g., functions/classes it calls or depends on from other files), based on the summary and imports.\n5. A list of what this file imports (imported modules/files).\n\nDO NOT INCLUDE RAW CODE IN THE SUMMARY.\n\nSummary:\n${summary}\n\nFormat:\n# ${title}\n\n_Created in run: ${timestamp}_\n\n## Explanation\n...\n\n## Use Case\n...\n\n## Abstraction/Responsibility\n...\n\n## Functions/Abstractions Used\n...\n\n## Imports\n${links.length > 0 ? links.map(l => `- ${l}`).join('\\n') : '(none)'}\n`;
    let llmResult = '';
    try {
      const result = await model.invoke(prompt);
      llmResult = typeof result.content === 'string' ? result.content.trim() : Array.isArray(result.content) ? result.content.join(' ').trim() : '';
    } catch {
      llmResult = '';
    }
    // Write to .md file with the name <original>.md
    const notePath = path.join(notesDir, `${path.basename(file, path.extname(file))}.md`);
    await fs.writeFile(notePath, llmResult || '# No explanation available.', "utf8");
  } catch (err) {
    console.error(`Failed to save note for ${file}:`, err);
  }
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
  // Track missing files and reasons
  missingFiles: Map<string, { source: string; reason: string }> = new Map();
  notesDir: string;
  timestamp: string;
  fileSummaries: Array<{
    file: string;
    title: string;
    explanation: string;
    useCase: string;
    abstraction: string;
    functionsUsed: string;
    imports: string[];
  }> = [];

  constructor(baseDirectory: string, entryFile: string, question: string) {
    this.baseDirectory = baseDirectory;
    this.entryFile = entryFile;
    this.question = question;
    // Generate a timestamped notes directory for this run (YYYY-MM-DD-HH)
    const now = new Date();
    this.timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    this.notesDir = path.resolve("notes", this.timestamp);
  }

  async run() {
    let toExplore: Array<{ file: string; parentFile?: string; aspect?: string }> = [{ file: this.entryFile, aspect: 'summary' }];
    let iteration = 0;
    await fs.mkdir(this.notesDir, { recursive: true });
    while (toExplore.length > 0) {
      const { file, parentFile, aspect = 'summary' } = toExplore.shift()!;
      if (this.exploredAspects.has(file) && this.exploredAspects.get(file)!.has(aspect)) continue;
      const chain = Array.from(this.contextMap.entries()).map(([f, v]) => ({ file: f, summary: v.summary, links: v.links }));
      const context: ResearchContext = { chain, parentFile };
      let research: ResearchResult | null = null;
      let links: string[] = [];
      try {
        research = await researchAgent(this.baseDirectory, file, this.question, context);
        if (research.error) {
          await updateReadmeAgentRunnable.invoke({ newContent: `## Problems Encountered\n- Error in file ${file}: ${research.error}`, reason: `Error encountered in ${file}` });
          const suggestion = await model.invoke(`The agent encountered this error: "${research.error}" while analyzing ${file}. What should it try next?`);
          await updateReadmeAgentRunnable.invoke({ newContent: `## Agent Recovery Suggestion\n- For file ${file}: ${suggestion}`, reason: `Agent recovery suggestion for ${file}` });
          if (!this.exploredAspects.has(file)) this.exploredAspects.set(file, new Set());
          this.exploredAspects.get(file)!.add(aspect);
          continue;
        }
        try {
          links = await linkFinderAgent(this.baseDirectory, file);
        } catch (err) {
          console.error('Error finding links in file', file, err);
          await updateReadmeAgentRunnable.invoke({ newContent: `## Problems Encountered\n- Error finding links in file ${file}: ${err}`, reason: `Link finding error in ${file}` });
          links = [];
        }
      } catch (err) {
        console.error('Unexpected error in file', file, err);
        await updateReadmeAgentRunnable.invoke({ newContent: `## Problems Encountered\n- Unexpected error in file ${file}: ${err}`, reason: `Unexpected error in ${file}` });
        if (!this.exploredAspects.has(file)) this.exploredAspects.set(file, new Set());
        this.exploredAspects.get(file)!.add(aspect);
        continue;
      }
      this.contextMap.set(file, { summary: research!.answer, links });
      if (!this.exploredAspects.has(file)) this.exploredAspects.set(file, new Set());
      this.exploredAspects.get(file)!.add(aspect);
      for (const link of links) {
        if (!this.exploredAspects.has(link) || !this.exploredAspects.get(link)!.has('summary')) {
          toExplore.push({ file: link, parentFile: file, aspect: 'summary' });
        }
      }
      for (const needed of research!.neededFiles) {
        if (!this.exploredAspects.has(needed) || !this.exploredAspects.get(needed)!.has('summary')) {
          toExplore.push({ file: needed, parentFile: file, aspect: 'summary' });
        }
      }
      if (research!.answer && research!.answer.startsWith('[Full file used for context]')) {
        this.exploredAspects.get(file)!.add('full');
      }
      // Save per-file .md note (no raw code backup)
      await saveFileNote(this.baseDirectory, file, research!.answer, this.notesDir, links, this.timestamp);
      // Instead of per-file notes, collect summary info for this file
      const title = await generateTitle(file, research!.answer);
      // Use LLM to generate all summary sections for this file
    const prompt = `Given the following summary for the file '${file}', and the following list of files it imports or links to: ${links.join(", ")}, write:\n1. A concise explanation of what this file does (1-2 sentences).\n2. A short description of the use case for this file (how/when/why it is used).\n3. What this file abstracts or what responsibility it encapsulates in the codebase.\n4. A list of the main functions or abstractions this file uses (e.g., functions/classes it calls or depends on from other files), based on the summary and imports.\n\nDO NOT INCLUDE RAW CODE IN THE SUMMARY. \n\nSummary:\n${research!.answer}\n`;
      let explanation = '', useCase = '', abstraction = '', functionsUsed = '';
      try {
        const result = await model.invoke(prompt);
        const text = typeof result.content === 'string' ? result.content : Array.isArray(result.content) ? result.content.join(' ') : '';
        // Try to split the LLM output into sections
        const expMatch = text.match(/1\.[^\n]*\n([\s\S]*?)2\./);
        const useMatch = text.match(/2\.[^\n]*\n([\s\S]*?)3\./);
        const absMatch = text.match(/3\.[^\n]*\n([\s\S]*?)4\./);
        const funMatch = text.match(/4\.[^\n]*\n([\s\S]*)/);
        explanation = expMatch ? expMatch[1].trim() : '';
        useCase = useMatch ? useMatch[1].trim() : '';
        abstraction = absMatch ? absMatch[1].trim() : '';
        functionsUsed = funMatch ? funMatch[1].trim() : '';
      } catch {
        explanation = useCase = abstraction = functionsUsed = '';
      }
      this.fileSummaries.push({
        file,
        title,
        explanation,
        useCase,
        abstraction,
        functionsUsed,
        imports: links
      });
      console.log(`REVIEW updated and backup saved after processing ${file}`);
    }
    // After all files explored, write a single summary file
    const summaryPath = path.join(this.notesDir, 'files-summary.md');
    let summaryMd = `# File Summaries\n\n`;
    for (const s of this.fileSummaries) {
      const ext = path.extname(s.file);
      const mdName = path.basename(s.file, ext) + '.md';
      summaryMd += `## ${s.title} (${mdName})\n\n`;
      summaryMd += `**Explanation:**\n${s.explanation}\n\n`;
      summaryMd += `**Use Case:**\n${s.useCase}\n\n`;
      summaryMd += `**Abstraction/Responsibility:**\n${s.abstraction}\n\n`;
      summaryMd += `**Functions/Abstractions Used:**\n${s.functionsUsed}\n\n`;
      summaryMd += `**Imports:**\n${s.imports.length > 0 ? s.imports.map(l => `- ${l}`).join('\n') : '(none)'}`;
      summaryMd += `\n\n`;
    }
    await fs.writeFile(summaryPath, summaryMd, 'utf8');
    // Write a path/answer summary file
    const pathSummaryPath = path.join(this.notesDir, 'path-summary.md');
    await fs.writeFile(pathSummaryPath, await this.buildMarkdown(), 'utf8');
    // Final update after all files explored
    const finalMarkdown = await this.buildMarkdown();
    await updateReadmeAgentRunnable.invoke({ newContent: finalMarkdown, reason: "Final update: all files explored" });
    // Also write the final review.md to the notes/<timestamp>/ folder
    const datedReviewPath = path.join(this.notesDir, 'review.md');
    await fs.writeFile(datedReviewPath, finalMarkdown, 'utf8');
    console.log("All files explored. Final context written to review.md");
  }

  async buildMarkdown() {
    // --- General Overview Section ---
    let overview = '# General Overview\n\n';
    // Build a reverse dependency map: file -> set of files that link to it
    const reverseDeps = new Map();
    for (const [file, { links }] of this.contextMap.entries()) {
      for (const link of links) {
        if (!reverseDeps.has(link)) reverseDeps.set(link, new Set());
        reverseDeps.get(link).add(file);
      }
    }
    // List all files and their direct connections
    overview += 'This codebase consists of the following researched files and their relationships:\n\n';
    for (const [file, { links }] of this.contextMap.entries()) {
      overview += `- **${file}**`;
      if (links.length > 0) {
        overview += ` imports/links to: ${links.join(", ")}`;
      }
      if (reverseDeps.has(file)) {
        overview += ` | used by: ${Array.from(reverseDeps.get(file)).join(", ")}`;
      }
      overview += '\n';
    }
    overview += '\nThe dependency graph shows how files are interconnected, with arrows indicating import or usage relationships. Entry file: **' + this.entryFile + '**.';

    // --- Code Chain Map Section ---
    let md = overview + "\n# Code Chain Map\n\n";
    for (const [file, { links }] of this.contextMap.entries()) {
      md += `- **${file}**\n`;
      for (const link of links) {
        md += `  - links to: ${link}\n`;
      }
      if (reverseDeps.has(file)) {
        md += `  - used by: ${Array.from(reverseDeps.get(file)).join(", ")}\n`;
      }
    }
    md += "\n# File Summaries\n\n";
    for (const [file, { summary, links }] of this.contextMap.entries()) {
      md += `## ${file}\n\n`;
      // Verbose summary: include what this file links to, who uses it, and its research summary
      md += `**Links to:** ${links.length > 0 ? links.join(", ") : "(none)"}\n\n`;
      if (reverseDeps.has(file)) {
        md += `**Used by:** ${Array.from(reverseDeps.get(file)).join(", ")}\n\n`;
      }
      md += `**Summary:**\n${summary}\n\n`;
    }
    // --- Missing Files Section ---
    if (this.missingFiles.size > 0) {
      md += '\n# Missing Files\n\n';
      for (const [missing, { source, reason }] of this.missingFiles.entries()) {
        md += `- **${missing}**\n  - Source: ${source}\n  - Reason wanted for review: ${reason}\n`;
      }
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
main(); 