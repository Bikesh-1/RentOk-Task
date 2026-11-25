import OpenAI from "openai";

let client;
export const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxRetries: 1
  });
  return client;
};
