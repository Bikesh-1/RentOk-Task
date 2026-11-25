import test from "node:test";
import assert from "node:assert/strict";
import { generateApiKey, hashApiKey } from "../src/utils/apiKey.js";

test("generated virtual keys use the gw_ prefix and contain 256 bits of randomness", () => {
  const key = generateApiKey();
  assert.match(key, /^gw_[a-f0-9]{64}$/);
});

test("hashing is deterministic and does not return the plaintext key", () => {
  const key = generateApiKey();
  const first = hashApiKey(key);
  assert.equal(first, hashApiKey(key));
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, key);
});

test("different keys produce different hashes", () => {
  assert.notEqual(hashApiKey(generateApiKey()), hashApiKey(generateApiKey()));
});
