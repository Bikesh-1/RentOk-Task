import express from "express";
import virtualKeyAuth from "../middleware/virtualKeyAuth.js";
import { createChatCompletion } from "../controllers/chatController.js";
const router = express.Router();
router.post("/chat/completions", virtualKeyAuth, createChatCompletion);
export default router;
