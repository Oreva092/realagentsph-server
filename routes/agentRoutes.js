import express from "express";
import rateLimit from "express-rate-limit";
import { registerAgent, getAgents, getAgentById } from "../controllers/agentController.js";

const router = express.Router();

// Limits registration attempts specifically — 5 attempts per 15 minutes per IP.
// Generous enough for genuine retries after a network hiccup, tight enough to
// stop someone spamming the form.
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many registration attempts. Please try again later." }
});

router.post("/", registerLimiter, registerAgent);
router.get("/", getAgents);
router.get("/:id", getAgentById);

export default router;