import prisma from "../config/db.js";

export const reserveBudget = async (keyId, estimatedCost) => {
  const amount = estimatedCost.toString();
  const rows = await prisma.$executeRaw`
    UPDATE "VirtualKey"
    SET "reservedAmount" = "reservedAmount" + CAST(${amount} AS DECIMAL(12,8))
    WHERE "id" = ${keyId} AND "isActive" = true
      AND "totalSpent" + "reservedAmount" + CAST(${amount} AS DECIMAL(12,8)) <= "budgetLimit"
  `;
  return rows === 1;
};

export const releaseBudget = async (keyId, estimatedCost) => {
  const amount = estimatedCost.toString();
  await prisma.$executeRaw`
    UPDATE "VirtualKey"
    SET "reservedAmount" = GREATEST("reservedAmount" - CAST(${amount} AS DECIMAL(12,8)), 0)
    WHERE "id" = ${keyId}
  `;
};

export const settleBudget = async ({ keyId, reservedCost, actualCost, usage }) => {
  const reserved = reservedCost.toString(), actual = actualCost.toString();
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$executeRaw`
      UPDATE "VirtualKey"
      SET "reservedAmount" = GREATEST("reservedAmount" - CAST(${reserved} AS DECIMAL(12,8)), 0),
          "totalSpent" = "totalSpent" + CAST(${actual} AS DECIMAL(12,8))
      WHERE "id" = ${keyId}
    `;
    if (rows !== 1) throw new Error("Unable to settle virtual key budget");
    await tx.usageLog.create({ data: {
      virtualKeyId: keyId, model: usage.model, provider: usage.provider,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      estimatedCost: actual, status: "SUCCESS"
    }});
  });
};

export const logFailedRequest = async ({ keyId, model, provider, errorMessage }) =>
  prisma.usageLog.create({ data: {
    virtualKeyId: keyId, model, provider, inputTokens: 0, outputTokens: 0,
    estimatedCost: "0", status: "FAILED", errorMessage: String(errorMessage).slice(0, 500)
  }});
