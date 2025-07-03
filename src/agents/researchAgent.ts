import { getFileContentsTool } from "../tools/getFileContentsTool.ts";
import { model } from "../model.ts";
import { z } from "zod";

export const ResearchResultSchema = z.object({
  answer: z.string(),
  neededFiles: z.array(z.string()),
  error: z.string().nullable().default(null),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

export interface ResearchContext {
  chain: Array<{ file: string; summary: string; links: string[] }>;
  parentFile?: string;
}

export async function researchAgent(
  baseDirectory: string,
  file: string,
  question: string,
  context?: ResearchContext
): Promise<ResearchResult> {
  const fileContent = await getFileContentsTool.invoke({
    baseDirectory,
    files: [file],
    full: false,
  });
  let contextSummary = `You are reviewing the file: ${file}.`;
  if (context) {
    if (context.parentFile) {
      contextSummary += ` This file is being researched because it was imported, referenced, or linked from the file: ${context.parentFile} as part of the code exploration. Please consider why this connection might be important for the current question.`;
    } else {
      contextSummary += ` This is the entry point file for the current analysis.`;
    }
  }
  const prompt = `
${contextSummary}
You are analyzing the file "${file}" for the question: "${question}"

--- FILE CONTENTS ---
${fileContent}

If the file is relevant, answer the question in detail and explain how it fits. If not, say 'Not relevant.'

If you believe there are other files (by name or path) that should be reviewed next to fully answer the question, list them in a JSON array under the heading 'neededFiles'.

Respond in the following JSON format:
{
  "answer": "...your answer...",
  "neededFiles": ["file1.ts", "file2.js", ...],
  "error": null
}`;
  const structuredModel = model.withStructuredOutput(ResearchResultSchema);
  try {
    const result = await structuredModel.invoke(prompt);
    return {
      answer: result.answer,
      neededFiles: result.neededFiles,
      error: null,
    };
  } catch (err: any) {
    console.error("LLM or parsing error in researchAgent:", err);
    let errorMsg: string | null = null;
    if (err && typeof err.message === 'string') {
      errorMsg = err.message;
    } else if (err) {
      errorMsg = String(err);
    }
    return {
      answer: "Error: Unable to get structured output from LLM.",
      neededFiles: [],
      error: (errorMsg ? errorMsg : null),
    };
  }
} 