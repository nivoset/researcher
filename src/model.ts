import { ChatOpenAI } from "@langchain/openai";

export const model = {
  async invoke(prompt: string): Promise<string> {
    // Placeholder: just echo the prompt for now
    return `LLM would organize this as markdown:\n\n${prompt}`;
  }
}; 