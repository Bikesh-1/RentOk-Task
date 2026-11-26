import {
  reserveBudget,
  releaseBudget,
  settleBudget,
  logFailedRequest
} from "../services/budgetService.js";
import {
  generateChatCompletion
} from "../services/providerService.js";
import {
  calculateCost,
  estimateRequestCost
} from "../utils/pricing.js";

const validMessages = messages => Array.isArray(messages) && messages.length > 0 &&
  messages.every(m => m && ["system", "user", "assistant"].includes(m.role) &&
    (typeof m.content === "string" || Array.isArray(m.content)));

export const createChatCompletion = async (req, res, next) => {
  const {
    messages,
    model,
    temperature = 0.7
  } = req.body ?? {};
  const requestedModel = model || process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";
  const maxTokens = Number(req.body?.max_tokens ?? 1024);
  const maxAllowed = Number(process.env.MAX_OUTPUT_TOKENS || 4096);
  if (!validMessages(messages)) return res.status(400).json({
    success: false,
    message: "messages must be a non-empty array of supported chat messages"
  });
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > maxAllowed) return res.status(400).json({
    success: false,
    message: `max_tokens must be between 1 and ${maxAllowed}`
  });
  if (typeof temperature !== "number" || temperature < 0 || temperature > 2) return res.status(400).json({
    success: false,
    message: "temperature must be between 0 and 2"
  });

  const keyId = req.virtualKey.id;
  const openEstimate = Number(estimateRequestCost({
    provider: "openai",
    messages,
    maxTokens
  }));
  const fallbackEstimate = process.env.GEMINI_API_KEY ? Number(estimateRequestCost({
    provider: "gemini",
    messages,
    maxTokens
  })) : 0;
  const reservedCost = Math.max(openEstimate, fallbackEstimate).toFixed(8);
  let reserved = false;

  try {
    reserved = await reserveBudget(keyId, reservedCost);
    if (!reserved) return res.status(402).json({
      success: false,
      message: "Insufficient budget for this request",
      budget: {
        limitUsd: req.virtualKey.budgetLimit,
        spentUsd: req.virtualKey.totalSpent
      }
    });

    const result = await generateChatCompletion({
      model: requestedModel,
      messages,
      maxTokens,
      temperature
    });
    const actualCost = calculateCost({
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens
    });
    await settleBudget({
      keyId,
      reservedCost,
      actualCost,
      usage: {
        model: result.model,
        provider: result.provider,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      }
    });
    reserved = false;

    return res.status(200).json({
      id: result.response.id || `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      model: result.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: result.content
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: result.inputTokens,
        completion_tokens: result.outputTokens,
        total_tokens: result.inputTokens + result.outputTokens
      },
      gateway: {
        provider: result.provider,
        cost_usd: actualCost
      }
    });
  } catch (error) {
    if (reserved) {
      try {
        await releaseBudget(keyId, reservedCost);
      } catch (releaseError) {
        console.error("Reservation release failed:", releaseError);
      }
    }
    try {
      await logFailedRequest({
        keyId,
        model: requestedModel,
        provider: "openai",
        errorMessage: error.message
      });
    } catch (logError) {
      console.error("Failed request log failed:", logError);
    }
    next(error);
  }
};