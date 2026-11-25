import express from "express";
import { createApiKey } from "../controllers/keyController.js";
import adminAuth from "../middleware/adminAuth.js";

const router = express.Router();

router.post("/", adminAuth, createApiKey);

export default router;