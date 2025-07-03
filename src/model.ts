import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'


export const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // model: ''
})

export const thinkingModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
})
