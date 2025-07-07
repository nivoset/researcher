import { getFileContentsTool } from "../tools/getFileContentsTool.ts";
import { model } from "../model.ts";
import { z } from "zod";
import { regexSearchTool } from "../tools/regexSearchTool.ts";
import path from "path";

export const ResearchResultSchema = z.object({
  answer: z.string(),
  neededFiles: z.array(z.string()),
  error: z.string().nullable().default(null),
  searchForUsage: z.object({
    regex: z.string().describe("the regex to use for the search, e.g. 'function\\s+([a-zA-Z0-9_]+)\\s*\\('"),
    flags: z.string().nullish().describe("the flags to use for the regex, e.g. 'i' for case-insensitive"),
    fileTypes: z.array(z.string()).describe("the file extensions to search for, .ts .java etc")
  }).nullish().describe("if you believe it is necessary to look for usage in files (for example, if you need to trace a function, class, or variable across the codebase), set the field 'searchForUsage' to an object with the following structure: { regex: string, flags?: string, fileTypes: string[] } in your JSON response. Otherwise."),
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

If the file contains relevant logic, answer the question in detail and explain how it fits based on the file contents only.
If not, say it is 'Not relevant.'

If you believe there are other files (by name or path) that should be reviewed next to fully answer
the question, list them in a JSON array under the heading 'neededFiles'.

If you believe it is necessary to look for usage in files (for example, if you need to trace a
function, class, or variable across the codebase), set the field 'searchForUsage'.

`;
  const structuredModel = model.withStructuredOutput(ResearchResultSchema);
  const results = await structuredModel.invoke(prompt);
  console.log('\n\n----- results -----\n\n', results);
  return results;
}

async function getStructuredSearchCriteria(question: string): Promise<{ regex: string, flags?: string, fileTypes: string[] }> {
  const prompt = `Given the question: "${question}", suggest a regex pattern, optional flags, and file types/extensions to search for relevant code. Respond in JSON: { regex: string, flags?: string, fileTypes: string[] }`;
  const structuredModel = model.withStructuredOutput(z.object({
    regex: z.string(),
    flags: z.string().optional(),
    fileTypes: z.array(z.string())
  }));
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
    result.answer = `[Full file used for context]\n` + result.answer;
  }

  // If searchForUsage is an object, use it for regex search
  if (result.searchForUsage && typeof result.searchForUsage === 'object') {
    const { regex, flags, fileTypes } = result.searchForUsage;
    const matches = regexSearchTool({ regex, flags }, fileTypes, baseDirectory);
    result.answer = `[Structured regex search used: ${JSON.stringify(result.searchForUsage)}]\n` + result.answer;
    result.neededFiles = Array.from(new Set([...(result.neededFiles || []), ...matches.map(f => path.relative(baseDirectory, f))]));
  }

  // Ensure error is always string|null
  const safeResult: ResearchResult = {
    answer: result.answer,
    neededFiles: result.neededFiles,
    error: typeof result.error === "undefined" ? null : result.error,
    searchForUsage: typeof result.searchForUsage === "undefined" ? false : result.searchForUsage,
  };

  return safeResult;
} 