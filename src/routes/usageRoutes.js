import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { getUsageSummary, getUsageForKey } from "../controllers/usageController.js";
const router = express.Router();
router.use(adminAuth);
router.get("/", getUsageSummary);
router.get("/:keyId", getUsageForKey);
export default router;
