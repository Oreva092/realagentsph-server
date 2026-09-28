import express from "express";
import rateLimit from "express-rate-limit";
import { adminLogin, forgotPassword, resetPassword } from "../controllers/authController.js";

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { message: "Too many login attempts. Please try again later." }
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Too many attempts. Please try again later." }
});

router.post("/login", loginLimiter, adminLogin);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/reset-password/:token", resetLimiter, resetPassword);

export default router;