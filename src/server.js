import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import prisma from "./config/db.js";

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
    const server = app.listen(PORT, () => console.log(`RentOk LLM Gateway listening on port ${PORT}`));
    const shutdown = async () => server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};
startServer();
