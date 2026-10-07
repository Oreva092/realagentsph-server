// controllers/reviewController.js  (new)
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Agent from "../models/Agent.js";
import { normalizeWhatsapp } from "../utils/normalizeWhatsapp.js";
import { sendEmail } from "../utils/mailer.js";
import { escapeHtml } from "../utils/escapeHtml.js";

const STATUSES = ["pending", "approved", "rejected"];

function isObjectId(value) {
    return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

// Public shape: deliberately has no phone number
function toPublic(review) {
    return {
        id: String(review._id),
        reviewerName: review.reviewerName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
    };
}

// Admin shape: includes the private number so you can contact the reviewer
function toAdmin(review) {
    return {
        id: String(review._id),
        agent: review.agent
            ? { id: String(review.agent._id), name: review.agent.name, area: review.agent.area }
            : null, // null = the agent was deleted
        reviewerName: review.reviewerName,
        reviewerWhatsapp: review.reviewerWhatsapp,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.createdAt
    };
}

// Recomputes the agent's average from APPROVED reviews only
async function refreshAgentRating(agentId) {
    const [stats] = await Review.aggregate([
        { $match: { agent: new mongoose.Types.ObjectId(agentId), status: "approved" } },
        { $group: { _id: "$agent", average: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);

    await Agent.findByIdAndUpdate(agentId, {
        rating: stats ? Math.round(stats.average * 10) / 10 : null,
        reviewCount: stats ? stats.count : 0
    });
}

export async function submitReview(req, res) {
    try {
        const { agentId, reviewerName, reviewerWhatsapp, rating, comment } = req.body;

        if (!isObjectId(agentId)) {
            return res.status(400).json({ message: "Invalid agent." });
        }
        if ([reviewerName, reviewerWhatsapp, comment].some((value) => typeof value !== "string")) {
            return res.status(400).json({ message: "Please fill in every field." });
        }

        const numericRating = Number(rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Please choose a star rating." });
        }

        const agent = await Agent.findById(agentId);
        if (!agent || agent.status !== "approved") {
            return res.status(404).json({ message: "Agent not found." });
        }
        if (!agent.verified) {
            return res.status(403).json({ message: "Only Verified agents can receive reviews." });
        }
        if (normalizeWhatsapp(reviewerWhatsapp.trim()) === agent.whatsapp) {
            return res.status(400).json({ message: "You can't review yourself." });
        }

        const review = await Review.create({
            agent: agent._id,
            reviewerName,
            reviewerWhatsapp,
            rating: numericRating,
            comment
        });

        // Tell the admin. Never let an email problem fail the review itself.
        if (process.env.ADMIN_NOTIFY_EMAIL) {
            const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
            const adminUrl = `${baseUrl}/admin/reviews`;

            sendEmail({
                to: process.env.ADMIN_NOTIFY_EMAIL,
                subject: `New review for ${agent.name} (${review.rating}/5)`,
                text: `${review.reviewerName} (${review.reviewerWhatsapp}) reviewed ${agent.name}: ${review.rating}/5\n\n"${review.comment}"\n\nApprove or reject it here: ${adminUrl}`,
                html: `
                    <p><strong>${escapeHtml(review.reviewerName)}</strong> (${escapeHtml(review.reviewerWhatsapp)}) reviewed <strong>${escapeHtml(agent.name)}</strong>: ${review.rating}/5</p>
                    <blockquote>${escapeHtml(review.comment)}</blockquote>
                    <p><a href="${adminUrl}">Approve or reject it</a></p>
                `
            }).catch((mailError) => console.error("Review notification email failed:", mailError));
        }

        res.status(201).json({
            message: "Thank you! Your review will appear once our team has checked it."
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const first = Object.values(error.errors)[0];
            return res.status(400).json({ message: first.message });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: "You've already reviewed this agent." });
        }
        console.error("Submit review error:", error);
        res.status(500).json({ message: "Could not save your review. Please try again." });
    }
}

// Public: approved reviews for one agent
export async function getAgentReviews(req, res) {
    try {
        const { agentId } = req.params;
        if (!isObjectId(agentId)) {
            return res.status(404).json({ message: "Agent not found." });
        }

        const agent = await Agent.findById(agentId).select("status rating reviewCount");
        if (!agent || agent.status !== "approved") {
            return res.status(404).json({ message: "Agent not found." });
        }

        const reviews = await Review.find({ agent: agent._id, status: "approved" })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({
            rating: agent.rating,
            reviewCount: agent.reviewCount,
            reviews: reviews.map(toPublic)
        });
    } catch (error) {
        console.error("Get agent reviews error:", error);
        res.status(500).json({ message: "Could not load reviews." });
    }
}

// Admin: every review, newest first
export async function getAllReviewsAdmin(req, res) {
    try {
        const reviews = await Review.find({})
            .sort({ createdAt: -1 })
            .limit(200)
            .populate("agent", "name area")
            .lean();

        res.json(reviews.map(toAdmin));
    } catch (error) {
        console.error("Get admin reviews error:", error);
        res.status(500).json({ message: "Could not load reviews." });
    }
}

// Admin: approve / reject
export async function updateReviewStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isObjectId(id)) return res.status(404).json({ message: "Review not found." });
        if (typeof status !== "string" || !STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid status." });
        }

        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ message: "Review not found." });

        review.status = status;
        await review.save();
        await refreshAgentRating(review.agent);

        res.json({ id: String(review._id), status: review.status });
    } catch (error) {
        console.error("Update review error:", error);
        res.status(500).json({ message: "Could not update the review." });
    }
}

// Admin: delete permanently
export async function deleteReview(req, res) {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(404).json({ message: "Review not found." });

        const review = await Review.findByIdAndDelete(id);
        if (!review) return res.status(404).json({ message: "Review not found." });

        await refreshAgentRating(review.agent);

        res.json({ message: "Review removed." });
    } catch (error) {
        console.error("Delete review error:", error);
        res.status(500).json({ message: "Could not remove the review." });
    }
}