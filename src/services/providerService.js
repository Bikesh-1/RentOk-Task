import openai from "../config/openai.js";

const callOpenAI = async ({ model, messages, maxTokens, temperature }) => {
  if (!openai) throw new Error("OPENAI_API_KEY is not configured");
  const response = await openai.chat.completions.create({ model, messages, max_tokens: maxTokens, temperature });
  return {
    provider: "openai", model: response.model || model,
    content: response.choices?.[0]?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    response
  };
};

const callGemini = async ({ messages, maxTokens, temperature }) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini fallback is not configured");
  const model = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash";
  const contents = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
  }));
  const system = messages.find(m => m.role === "system")?.content;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: String(system) }] } } : {}),
      contents, generationConfig: { maxOutputTokens: maxTokens, temperature }
    }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Gemini HTTP ${response.status}`);
  return {
    provider: "gemini", model,
    content: data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "",
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    response: data
  };
};

export const generateChatCompletion = async input => {
  try { return await callOpenAI(input); }
  catch (primaryError) {
    if (!process.env.GEMINI_API_KEY) throw primaryError;
    try { return await callGemini(input); }
    catch (fallbackError) {
      throw new Error(`OpenAI failed: ${primaryError.message}; Gemini fallback failed: ${fallbackError.message}`);
    }
  }
};
