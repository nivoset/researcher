import * as fs from "fs/promises";
import { RunnableLambda } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { model } from "../model.ts";

// If you see a type error for 'fs/promises', install @types/node:
// npm install --save-dev @types/node

const README_PATH = "README.md";

// Create a model runnable that always outputs a string
const modelStringRunnable = model.pipe(new StringOutputParser());

export const updateReadmeAgentRunnable = RunnableLambda.from(
  async ({ newContent, reason }: { newContent: string; reason: string }) => {
    let readme = "";
    try {
      readme = await fs.readFile(README_PATH, "utf8");
    } catch {
      // If file doesn't exist, start fresh
      readme = "";
    }

    // Remove any existing history section
    const historyRegex = /## History[\s\S]*$/;
    let mainContent = readme.replace(historyRegex, "").trim();

    // Use the model runnable to organize the new content as markdown
    mainContent = (await modelStringRunnable.invoke(newContent)).trim();

    // Prepare history
    const now = new Date().toISOString();
    let historySection = "";
    const prevHistoryMatch = readme.match(historyRegex);
    if (prevHistoryMatch) {
      historySection = prevHistoryMatch[0].trim();
    } else {
      historySection = "## History\n";
    }
    // Append new entry
    historySection += `\n- ${now}: ${reason}`;

    // Write back
    const updated = `${mainContent}\n\n${historySection}\n`;
    await fs.writeFile(README_PATH, updated, "utf8");
    return updated;
  }
); 