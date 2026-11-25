import test from "node:test";
import assert from "node:assert/strict";
import { calculateCost, estimateRequestCost } from "../src/utils/pricing.js";

test("calculates token cost in USD using configured per-million rates", () => {
  const oldInput = process.env.OPENAI_INPUT_USD_PER_1M;
  const oldOutput = process.env.OPENAI_OUTPUT_USD_PER_1M;
  process.env.OPENAI_INPUT_USD_PER_1M = "1";
  process.env.OPENAI_OUTPUT_USD_PER_1M = "2";
  try {
    assert.equal(calculateCost({ provider: "openai", inputTokens: 1000, outputTokens: 1000 }), "0.00300000");
  } finally {
    if (oldInput === undefined) delete process.env.OPENAI_INPUT_USD_PER_1M;
    else process.env.OPENAI_INPUT_USD_PER_1M = oldInput;
    if (oldOutput === undefined) delete process.env.OPENAI_OUTPUT_USD_PER_1M;
    else process.env.OPENAI_OUTPUT_USD_PER_1M = oldOutput;
  }
});

test("estimates a positive request cost", () => {
  const estimate = Number(estimateRequestCost({
    provider: "openai",
    messages: [{ role: "user", content: "Hello gateway" }],
    maxTokens: 100
  }));
  assert.ok(estimate > 0);
});
