// routes/reviewRoutes.js  (new)
import express from "express";
import rateLimit from "express-rate-limit";
import {
    submitReview,
    getAgentReviews,
    getAllReviewsAdmin,
    updateReviewStatus,
    deleteReview
} from "../controllers/reviewController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many reviews from this connection. Please try again later." }
});

router.post("/", submitLimiter, submitReview);
router.get("/agent/:agentId", getAgentReviews);
router.get("/admin", protect, getAllReviewsAdmin);
router.put("/:id", protect, updateReviewStatus);
router.delete("/:id", protect, deleteReview);

export default router;