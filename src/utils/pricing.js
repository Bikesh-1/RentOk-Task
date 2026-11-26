const rate = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};
const rates = {
  openai: {
    input: () => rate("OPENAI_INPUT_USD_PER_1M", 0.15),
    output: () => rate("OPENAI_OUTPUT_USD_PER_1M", 0.60)
  },
  gemini: {
    input: () => rate("GEMINI_INPUT_USD_PER_1M", 0.10),
    output: () => rate("GEMINI_OUTPUT_USD_PER_1M", 0.40)
  }
};
export const calculateCost = ({
  provider,
  inputTokens,
  outputTokens
}) => {
  const p = rates[provider];
  if (!p) throw new Error("Unsupported pricing provider");
  return ((inputTokens * p.input() + outputTokens * p.output()) / 1_000_000).toFixed(8);
};
export const estimateRequestCost = ({
  provider,
  messages,
  maxTokens
}) => {
  const chars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content ?? "").length), 0);
  const multiplier = Math.max(1, Number(process.env.BUDGET_ESTIMATE_MULTIPLIER || 1.5));
  return calculateCost({
    provider,
    inputTokens: Math.ceil(Math.max(1, chars / 4) * multiplier),
    outputTokens: Math.ceil(maxTokens * multiplier)
  });
};