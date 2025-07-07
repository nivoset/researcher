import * as fs from "fs/promises";
import { RunnableLambda } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { model } from "../model.ts";

// If you see a type error for 'fs/promises', install @types/node:
// npm install --save-dev @types/node

const REVIEW_PATH = "review.md";

// Create a model runnable that always outputs a string
const modelStringRunnable = model.pipe(new StringOutputParser());

// Cleanup agent: deduplicate markdown using the LLM
async function cleanupMarkdownAgent(markdown: string): Promise<string> {
  const prompt = `You are a markdown cleanup agent. Remove duplicate or near-duplicate sections, summaries, or lists from the following markdown. Keep only the most complete or recent version of each unique piece of information. Output clean, non-redundant markdown.\n\n---\n${markdown}\n---`;
  return (await modelStringRunnable.invoke(prompt)).trim();
}

export const updateReadmeAgentRunnable = RunnableLambda.from(
  async ({ newContent, reason }: { newContent: string; reason: string }) => {
    let review = "";
    try {
      review = await fs.readFile(REVIEW_PATH, "utf8");
    } catch {
      // If file doesn't exist, start fresh
      review = "";
    }

    // Remove any existing history section, but keep all other content
    const historyRegex = /## History[\s\S]*$/;
    const historyMatch = review.match(historyRegex);
    let mainContent = review.replace(historyRegex, "").trim();

    // Use the model runnable to organize the new content as markdown
    const formattedNewContent = (await modelStringRunnable.invoke(newContent)).trim();

    // Append new content to the end of the main content, with spacing
    if (mainContent.length > 0) {
      mainContent = `${mainContent}\n\n${formattedNewContent}`;
    } else {
      mainContent = formattedNewContent;
    }

    // --- CLEANUP STEP: deduplicate before writing ---
    mainContent = await cleanupMarkdownAgent(mainContent);

    // Prepare history
    const now = new Date().toISOString();
    let historySection = "";
    if (historyMatch) {
      historySection = historyMatch[0].trim();
    } else {
      historySection = "## History\n";
    }
    // Append new entry
    historySection += `\n- ${now}: ${reason}`;

    // Write back
    const updated = `${mainContent}\n\n${historySection}\n`;
    await fs.writeFile(REVIEW_PATH, updated, "utf8");
    return updated;
  }
); 