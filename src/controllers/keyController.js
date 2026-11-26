import prisma from "../config/db.js";
import { generateApiKey, hashApiKey } from "../utils/apiKey.js";
import { parsePositiveBudget } from "../utils/validation.js";

export const createApiKey = async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    const budgetInput = req.body?.budgetLimit ?? req.body?.budget;
    const budget = parsePositiveBudget(budgetInput);

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Valid key name is required" });
    }
    if (budget === null) {
      return res.status(400).json({ success: false, message: "Budget limit must be a positive number" });
    }

    const apiKey = generateApiKey();
    const record = await prisma.virtualKey.create({
      data: { name: name.trim(), keyHash: hashApiKey(apiKey), budgetLimit: budget.toFixed(8) },
      select: {
        id: true, name: true, budgetLimit: true, totalSpent: true,
        reservedAmount: true, isActive: true, createdAt: true
      }
    });
    return res.status(201).json({
      success: true,
      message: "Virtual API key generated. Save it now; it cannot be retrieved again.",
      data: { ...record, apiKey }
    });
  } catch (error) { next(error); }
};

export const listApiKeys = async (req, res, next) => {
  try {
    const keys = await prisma.virtualKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, budgetLimit: true, totalSpent: true,
        reservedAmount: true, isActive: true, createdAt: true
      }
    });
    res.json({ success: true, data: keys });
  } catch (error) { next(error); }
};
