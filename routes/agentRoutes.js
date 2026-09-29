import express from "express";
import rateLimit from "express-rate-limit";
import { registerAgent, getPublicAgents, getAllAgentsAdmin, getAgentById, updateAgent, deleteAgent, getAgentStats } from "../controllers/agentController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many registration attempts. Please try again later." }
});

// Runs before any route containing ":id". Malformed ids get a clean 404 instead of a CastError 500.
router.param("id", (req, res, next, id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return res.status(404).json({ message: "Agent not found" });
    }
    next();
});

// Order matters: fixed paths (/admin, /stats) must sit above /:id
router.post("/", registerLimiter, registerAgent);
router.get("/", getPublicAgents);
router.get("/admin", protect, getAllAgentsAdmin);
router.get("/stats", getAgentStats);
router.get("/:id", getAgentById);
router.put("/:id", protect, updateAgent);
router.delete("/:id", protect, deleteAgent);

export default router;