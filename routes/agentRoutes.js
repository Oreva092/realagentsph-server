import express from "express";
import rateLimit from "express-rate-limit";
import { registerAgent, getAgents, getAgentById, updateAgent, deleteAgent } from "../controllers/agentController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many registration attempts. Please try again later." }
});

router.post("/", registerLimiter, registerAgent);
router.get("/", getAgents);
router.get("/:id", getAgentById);
router.put("/:id", protect, updateAgent);
router.delete("/:id", protect, deleteAgent);

export default router;