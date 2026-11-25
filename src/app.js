
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import keyRoutes from "./routes/keyRoutes.js";
import virtualKeyAuth from "./middleware/virtualKeyAuth.js";
const app = express();

// Security headers
app.use(helmet());

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "RentOk LLM Gateway is running"
    });
});

app.use("/api/keys", keyRoutes);
app.get("/api/test-auth", virtualKeyAuth, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Virtual API key authenticated successfully",
        data: {
            id: req.virtualKey.id,
            name: req.virtualKey.name,
            budgetLimit: req.virtualKey.budgetLimit,
            totalSpent: req.virtualKey.totalSpent
        }
    });
});

export default app;
