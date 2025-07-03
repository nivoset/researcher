import { ChatOpenAI } from "@langchain/openai";

export const model = new ChatOpenAI({
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
  },
  model: "gpt-35-turbo",
}); 