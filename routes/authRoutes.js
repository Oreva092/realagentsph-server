import express from "express";
import rateLimit from "express-rate-limit";
import { adminLogin } from "../controllers/authController.js";

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { message: "Too many login attempts. Please try again later." }
});

router.post("/login", loginLimiter, adminLogin);

export default router;