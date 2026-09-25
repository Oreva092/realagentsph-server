import mongoose from "mongoose";


function normalizeWhatsapp(value) {
    if (!value) return value;
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("0")) {
        digits = "234" + digits.slice(1);
    } else if (!digits.startsWith("234") && digits.length === 10) {
        digits = "234" + digits;
    }

    return digits;
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
            trim: true
        },
        type: {
            type: [String],
            required: [true, "At least one property type is required"],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: "At least one property type must be selected"
            }
        },
        photo: {
            type: String,
            required: [true, "A photo is required"]
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