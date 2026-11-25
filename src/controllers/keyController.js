import prisma from "../config/db.js";
import { generateApiKey, hashApiKey } from "../utils/apiKey.js";

export const createApiKey = async (req, res) => {
    try {
        const { name, budgetLimit } = req.body;

        // Validate input
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid key name is required"
            });
        }

        const budget = Number(budgetLimit);

        if (
            budgetLimit === undefined ||
            budgetLimit === null ||
            typeof budgetLimit === "boolean" ||
            !Number.isFinite(budget) ||
            budget <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Budget limit must be a positive number"
            });
        }

        // Generate original API key
        const apiKey = generateApiKey();

        // Hash API key
        const keyHash = hashApiKey(apiKey);

        // Store only hashed key
        const newKey = await prisma.virtualKey.create({
            data: {
                name: name.trim(),
                keyHash,
                budgetLimit: budget.toFixed(8)
            },
            select: {
                id: true,
                name: true,
                budgetLimit: true,
                totalSpent: true,
                isActive: true,
                createdAt: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Virtual API key generated successfully",
            data: {
                ...newKey,
                apiKey
            }
        });

    } catch (error) {
        console.error("Create API key error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};