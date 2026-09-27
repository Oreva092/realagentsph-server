import express from "express";
import rateLimit from "express-rate-limit";
import { registerAgent, getPublicAgents, getAllAgentsAdmin, getAgentById, updateAgent, deleteAgent, getAgentStats } from "../controllers/agentController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many registration attempts. Please try again later." }
});

router.post("/", registerLimiter, registerAgent);
router.get("/", getPublicAgents);
router.get("/admin", protect, getAllAgentsAdmin);
router.get("/stats", getAgentStats)
router.get("/:id", getAgentById);
router.put("/:id", protect, updateAgent);
router.delete("/:id", protect, deleteAgent);

export default router;