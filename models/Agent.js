import mongoose from "mongoose";

function normalizeWhatsapp(value) {
    // Non-strings pass through untouched so Mongoose reports a normal validation error
    if (typeof value !== "string" || !value) return value;

    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("2340")) {
        // "+234 0904..." typed with the local zero still in place
        digits = "234" + digits.slice(4);
    } else if (digits.startsWith("0")) {
        digits = "234" + digits.slice(1);
    } else if (!digits.startsWith("234") && digits.length === 10) {
        digits = "234" + digits;
    }

    return digits;
}

// Accepts only https Cloudinary image URLs from our own cloud.
// Parsing with URL (instead of checking a string prefix) resolves tricks like "/../" before we compare.
function isCloudinaryPhoto(value) {
    if (typeof value !== "string" || value.length > 500) return false;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "ucwlwwrk";

    try {
        const url = new URL(value);
        return (
            url.protocol === "https:" &&
            url.hostname === "res.cloudinary.com" &&
            !url.username &&
            !url.password &&
            url.pathname.startsWith(`/${cloudName}/image/upload/`)
        );
    } catch {
        return false;
    }
}

const agentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            maxlength: [80, "Name is too long"]
        },
        whatsapp: {
            type: String,
            required: [true, "WhatsApp number is required"],
            trim: true,
            unique: true,
            set: normalizeWhatsapp,
            match: [/^\+?[0-9]{10,15}$/, "Enter a valid phone number"]
        },
        area: {
            type: String,
            required: [true, "Area is required"],
            trim: true,
            maxlength: [80, "Area is too long"]
        },
        type: {
            type: [{ type: String, trim: true, maxlength: [40, "Property type is too long"] }],
            required: [true, "At least one property type is required"],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.length <= 10,
                message: "Select between 1 and 10 property types"
            }
        },
        photo: {
            type: String,
            required: [true, "A photo is required"],
            trim: true,
            validate: {
                validator: isCloudinaryPhoto,
                message: "Photo must be an uploaded Cloudinary image"
            }
        },
        status: {
            type: String,
            enum: {
                values: ["pending", "approved", "rejected"],
                message: "Status must be pending, approved, or rejected"
            },
            default: "pending"
        },
        verified: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: null
        },
        reviewCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true }
    }
);

agentSchema.index({ area: 1 });
agentSchema.index({ verified: 1 });
agentSchema.index({ status: 1 });

const Agent = mongoose.model("Agent", agentSchema);

export default Agent;