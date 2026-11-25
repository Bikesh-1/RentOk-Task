import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { createApiKey, listApiKeys } from "../controllers/keyController.js";
const router = express.Router();
router.use(adminAuth);
router.post("/", createApiKey);
router.get("/", listApiKeys);
export default router;
