import prisma from "../config/db.js";
import { hashApiKey } from "../utils/apiKey.js";

const virtualKeyAuth = async (req, res, next) => {
    try {
        // 1. Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "API key is missing"
            });
        }

        // 2. Extract original API key
        const apiKey = authHeader.slice(7).trim();

        if (!apiKey || !apiKey.startsWith("gw_")) {
            return res.status(401).json({
                success: false,
                message: "Invalid API key"
            });
        }

        // 3. Hash incoming API key
        const keyHash = hashApiKey(apiKey);

        // 4. Find key in database
        const virtualKey = await prisma.virtualKey.findUnique({
            where: {
                keyHash
            },
            select: {
                id: true,
                name: true,
                budgetLimit: true,
                totalSpent: true,
                isActive: true
            }
        });

        // 5. Validate key
        if (!virtualKey) {
            return res.status(401).json({
                success: false,
                message: "Invalid API key"
            });
        }

        // 6. Check whether key is active
        if (!virtualKey.isActive) {
            return res.status(403).json({
                success: false,
                message: "API key is inactive"
            });
        }

        // 7. Attach key information to request
        req.virtualKey = virtualKey;

        next();

    } catch (error) {
        console.error("Virtual key authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed"
        });
    }
};

export default virtualKeyAuth;