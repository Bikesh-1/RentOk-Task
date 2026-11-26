import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import keyRoutes from "./routes/keyRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use(express.static("public"));

app.get("/health", (req, res) => res.status(200).json({
  success: true, message: "RentOk LLM Gateway is running"
}));

app.use("/api/keys", keyRoutes);
app.use("/api/usage", usageRoutes);
app.use("/v1", chatRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);
export default app;
