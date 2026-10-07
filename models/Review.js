// models/Review.js  (new)
import mongoose from "mongoose";
import { normalizeWhatsapp } from "../utils/normalizeWhatsapp.js";

const reviewSchema = new mongoose.Schema(
    {
        agent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agent",
            required: true,
            index: true
        },
        reviewerName: {
            type: String,
            required: [true, "Your name is required"],
            trim: true,
            maxlength: [60, "Name is too long"]
        },
        // Private: used only to stop duplicates and self-reviews. Never sent to the public site.
        reviewerWhatsapp: {
            type: String,
            required: [true, "Your WhatsApp number is required"],
            trim: true,
            set: normalizeWhatsapp,
            match: [/^[0-9]{10,15}$/, "Enter a valid phone number"]
        },
        rating: {
            type: Number,
            required: [true, "Please choose a star rating"],
            min: [1, "Rating must be between 1 and 5"],
            max: [5, "Rating must be between 1 and 5"],
            validate: { validator: Number.isInteger, message: "Rating must be a whole number" }
        },
        comment: {
            type: String,
            required: [true, "Please write a short review"],
            trim: true,
            minlength: [10, "Please write at least 10 characters"],
            maxlength: [600, "Review is too long (600 characters max)"]
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true
        }
    },
    { timestamps: true }
);

// One review per phone number per agent
reviewSchema.index({ agent: 1, reviewerWhatsapp: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;