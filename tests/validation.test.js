import test from "node:test";
import assert from "node:assert/strict";
import { parsePositiveBudget } from "../src/utils/validation.js";

test("accepts positive numeric budgets", () => {
  assert.equal(parsePositiveBudget(5), 5);
  assert.equal(parsePositiveBudget("5"), 5);
  assert.equal(parsePositiveBudget("0.25"), 0.25);
});

test("rejects missing, blank, non-numeric, zero, negative and boolean budgets", () => {
  for (const value of [undefined, null, "", "   ", "abc", 0, -1, true, false, NaN, Infinity]) {
    assert.equal(parsePositiveBudget(value), null, `expected ${String(value)} to be rejected`);
  }
});
