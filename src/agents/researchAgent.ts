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

async function getLLMAnswer(fileContent: string, file: string, question: string, contextSummary: string) {
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
  return await structuredModel.invoke(prompt);
}

export async function researchAgent(
  baseDirectory: string,
  file: string,
  question: string,
  context?: ResearchContext
): Promise<ResearchResult> {
  // Compose context summary
  let contextSummary = `You are reviewing the file: ${file}.`;
  if (context) {
    if (context.parentFile) {
      contextSummary += ` This file is being researched because it was imported, referenced, or linked from the file: ${context.parentFile} as part of the code exploration. Please consider why this connection might be important for the current question.`;
    } else {
      contextSummary += ` This is the entry point file for the current analysis.`;
    }
  }

  // First, try with summary
  let fileContent = await getFileContentsTool.invoke({
    baseDirectory,
    files: [file],
    full: false,
  });
  let usedFull = false;
  let result = await getLLMAnswer(fileContent, file, question, contextSummary);

  // If the answer is 'Not relevant', 'Insufficient context', or fileContent is very short, try with full file
  const needsFull =
    (typeof result.answer === "string" &&
      (/not relevant|insufficient context|not enough information|cannot answer|need more context/i.test(result.answer) || fileContent.length < 100));

  if (needsFull && !usedFull) {
    fileContent = await getFileContentsTool.invoke({
      baseDirectory,
      files: [file],
      full: true,
    });
    usedFull = true;
    result = await getLLMAnswer(fileContent, file, question, contextSummary);
    // Indicate in the answer that the full file was used
    result.answer = `[Full file used for context]\n` + result.answer;
  }

  // Ensure error is always string|null
  const safeResult: ResearchResult = {
    answer: result.answer,
    neededFiles: result.neededFiles,
    error: typeof result.error === "undefined" ? null : result.error,
  };

  return safeResult;
} 