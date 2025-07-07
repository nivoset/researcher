import * as fs from "fs/promises";
import { model } from "../model.ts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const REVIEW_PATH = "review.md";
const REVIEW1_PATH = "review-1.md";
const REVIEW2_PATH = "review-2.md";
const FINAL_REVIEW_PATH = "final-review.md";

const modelStringRunnable = model.pipe(new StringOutputParser());

async function runAgentOnFile(inputPath: string, outputPath: string, prompt: string) {
  try {
    const content = await fs.readFile(inputPath, "utf8");
    const fullPrompt = `${prompt}\n\n---\n${content}\n---`;
    const result = await modelStringRunnable.invoke(fullPrompt);
    await fs.writeFile(outputPath, result.trim(), "utf8");
    return result.trim();
  } catch (err) {
    console.error(`Error processing ${inputPath} -> ${outputPath}:`, err);
    throw err;
  }
}

export async function finalizeReview() {
  try {
    // Phase 1: Gathering phase - extract key information and linkages between files for the topic
    await runAgentOnFile(
      REVIEW_PATH,
      REVIEW1_PATH,
      "Extract all key information, facts, and especially the linkages between files relevant to the main topic from the following stream-of-consciousness notes. For each part of the topic, clearly state which files and which specific functions (by name) are responsible for that part. Do not say which files are 'likely' to contain something—be explicit and direct. Map responsibilities and key function names to their files. Do not summarize or organize for consumption; focus on gathering raw, explicit insights, references, and relationships."
    );

    // Phase 2: Organize/summarize the gathered information into a consumable piece
    await runAgentOnFile(
      REVIEW1_PATH,
      REVIEW2_PATH,
      "Take the gathered information and linkages below and organize/summarize it into a clear, well-structured, and consumable markdown document. Group related points, clarify ambiguous statements, and make it easy for a reader to understand the key findings and their relationships."
    );

    // Phase 3: Review both for logical flow and codebase navigation
    const review1 = await fs.readFile(REVIEW1_PATH, "utf8");
    const review2 = await fs.readFile(REVIEW2_PATH, "utf8");
    const comparePrompt = `Review the following two outputs to help build and clarify the logical flow of the codebase. Your goal is to make it easier for a developer to find and understand responsibilities, relationships, and navigation within the code. Focus on improving clarity, logical structure, and discoverability, not just resolving contradictions. Output a final, publishable markdown review that is accurate, consistent, and makes the codebase easy to navigate.\n\n--- Review 1 ---\n${review1}\n\n--- Review 2 ---\n${review2}\n---`;
    const finalResult = await modelStringRunnable.invoke(comparePrompt);
    await fs.writeFile(FINAL_REVIEW_PATH, finalResult.trim(), "utf8");
  } catch (err) {
    console.error("Error in finalizeReview:", err);
    throw err;
  }
}

// If run directly, execute the finalization
if (require.main === module) {
  finalizeReview().then(() => {
    console.log("Final review process complete. See final-review.md.");
  }).catch((err) => {
    console.error("Final review process failed:", err);
  });
} 